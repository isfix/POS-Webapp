'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase, supabaseBucketName } from "@/lib/supabase";
import { Separator } from "@/components/ui/separator";

const colorOptions = [
    { name: 'Default', value: 'default', hsl: '240 67% 97%', className: 'bg-[hsl(240,67%,97%)]' },
    { name: 'Dark', value: 'dark', hsl: '240 4% 15%', className: 'bg-[hsl(240,4%,15%)]' },
    { name: 'Ocean', value: 'ocean', hsl: '210 40% 96%', className: 'bg-[hsl(210,40%,96%)]' },
    { name: 'Sunset', value: 'sunset', hsl: '30 80% 95%', className: 'bg-[hsl(30,80%,95%)]' },
    { name: 'Forest', value: 'forest', hsl: '120 20% 96%', className: 'bg-[hsl(120,20%,96%)]' },
    { name: 'Twilight', value: 'twilight', hsl: '270 40% 97%', className: 'bg-[hsl(270,40%,97%)]' },
    { name: 'Sand', value: 'sand', hsl: '40 60% 95%', className: 'bg-[hsl(40,60%,95%)]' },
    { name: 'Sakura', value: 'sakura', hsl: '340 80% 96%', className: 'bg-[hsl(340,80%,96%)]' },
    { name: 'Mint', value: 'mint', hsl: '150 50% 96%', className: 'bg-[hsl(150,50%,96%)]' },
    { name: 'Peach', value: 'peach', hsl: '25 90% 95%', className: 'bg-[hsl(25,90%,95%)]' },
];

const colorMap = colorOptions.reduce((acc, curr) => {
    acc[curr.value] = curr.hsl;
    return acc;
}, {} as Record<string, string>);

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const { toast } = useToast();
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleBackgroundChange = (type: 'color' | 'image', value: string) => {
        try {
            const mainElement = document.querySelector('main');

            if (type === 'image') {
                if (!value || !value.startsWith('http')) {
                    toast({ title: 'Invalid URL', description: 'Please enter a valid image URL.', variant: 'destructive' });
                    return;
                }
                document.documentElement.classList.add('has-image-background');
                document.body.style.backgroundImage = `url('${value}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
                 if (mainElement) {
                    mainElement.style.backgroundColor = 'hsla(var(--card), 0.1)';
                }
            } else {
                 document.documentElement.classList.remove('has-image-background');
                 document.body.style.backgroundImage = 'none';
                if (value in colorMap) {
                    document.documentElement.style.setProperty('--background', colorMap[value]);
                }
                if (mainElement) {
                    mainElement.style.backgroundColor = ''; // Revert to class style
                }
            }
            localStorage.setItem('backgroundSetting', JSON.stringify({ type, value }));
            toast({ title: 'Success', description: 'Background updated.' });
        } catch (e) {
            console.error("Failed to apply background", e);
            toast({ title: 'Error', description: 'Could not apply background.', variant: 'destructive' });
        }
    };
    
    const handleReset = () => {
        handleBackgroundChange('color', 'default');
    }

    const handleImageUpload = async () => {
        if (!imageFile) {
            toast({ title: 'No file selected', description: 'Please choose an image to upload.', variant: 'destructive' });
            return;
        }
        setUploading(true);

        const fileExt = imageFile.name.split('.').pop();
        const fileName = `bg-${Date.now()}.${fileExt}`;
        const filePath = `backgrounds/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(supabaseBucketName)
            .upload(filePath, imageFile);

        if (uploadError) {
            toast({ title: 'Upload Error', description: uploadError.message, variant: 'destructive' });
            setUploading(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from(supabaseBucketName)
            .getPublicUrl(filePath);

        handleBackgroundChange('image', urlData.publicUrl);
        setUploading(false);
        setImageFile(null); 
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>This is your account information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarFallback>
                                {loading ? <Skeleton className="h-16 w-16 rounded-full" /> : <User className="h-8 w-8" />}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                            {loading ? (
                                <Skeleton className="h-6 w-48 mt-1" />
                            ) : (
                                <p className="text-lg font-semibold">{user?.email}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of your application's background.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="color" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="color">Color</TabsTrigger>
                            <TabsTrigger value="image">Image</TabsTrigger>
                        </TabsList>
                        <TabsContent value="color" className="mt-4">
                             <div className="space-y-4">
                                <Label>Choose a background color</Label>
                                <div className="flex flex-wrap gap-3">
                                    {colorOptions.map(color => (
                                        <button 
                                            key={color.value}
                                            title={color.name}
                                            className={cn("h-10 w-10 rounded-full border-2", color.className)}
                                            onClick={() => handleBackgroundChange('color', color.value)}
                                        />
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={handleReset}>Reset to Default</Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="image" className="mt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="imageUpload">Upload a new background</Label>
                                    <Input 
                                        id="imageUpload"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                                    />
                                </div>
                                <Button onClick={handleImageUpload} disabled={uploading || !imageFile}>
                                    {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Upload & Apply
                                </Button>
                                
                                <Separator />

                                <div className="space-y-2">
                                    <Label htmlFor="imageUrl">Or use image URL (Legacy)</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            id="imageUrl"
                                            placeholder="https://images.unsplash.com/..." 
                                            value={imageUrl} 
                                            onChange={(e) => setImageUrl(e.target.value)} 
                                        />
                                        <Button onClick={() => handleBackgroundChange('image', imageUrl)} variant="outline">Apply URL</Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
