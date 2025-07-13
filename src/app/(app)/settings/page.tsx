

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Loader2, History, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase, supabaseBucketName } from "@/lib/supabase";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import Image from "next/image";

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
    { name: 'Stone', value: 'stone', hsl: '240 5% 96%', className: 'bg-[hsl(240,5%,96%)]' },
    { name: 'Rose', value: 'rose', hsl: '350 78% 97%', className: 'bg-[hsl(350,78%,97%)]' },
    { name: 'Sky', value: 'sky', hsl: '190 80% 96%', className: 'bg-[hsl(190,80%,96%)]' },
    { name: 'Slate', value: 'slate', hsl: '220 13% 18%', className: 'bg-[hsl(220,13%,18%)]' },
    { name: 'Olive', value: 'olive', hsl: '70 20% 95%', className: 'bg-[hsl(70,20%,95%)]' },
];

const darkTextColors = [
    { name: 'Default Dark', value: 'default-dark', hsl: '240 10% 20%' },
    { name: 'Graphite', value: 'graphite', hsl: '240 10% 10%' },
    { name: 'Deep Navy', value: 'deep-navy', hsl: '222 47% 11%' },
    { name: 'Charcoal', value: 'charcoal', hsl: '240 5% 25%' },
    { name: 'Forest Green', value: 'forest-green', hsl: '120 25% 15%' },
    { name: 'Espresso', value: 'espresso', hsl: '25 35% 18%' },
    { name: 'Plum', value: 'plum', hsl: '290 25% 20%' },
    { name: 'Midnight', value: 'midnight', hsl: '240 40% 10%' },
    { name: 'Ink', value: 'ink', hsl: '220 50% 15%' },
];

const lightTextColors = [
    { name: 'Default Light', value: 'default-light', hsl: '0 0% 100%' },
    { name: 'Snow', value: 'snow', hsl: '0 0% 98%' },
    { name: 'Warm White', value: 'warm-white', hsl: '60 30% 96%' },
    { name: 'Ivory', value: 'ivory', hsl: '48 100% 95%' },
    { name: 'Light Lavender', value: 'light-lavender', hsl: '240 60% 97%' },
    { name: 'Light Rose', value: 'light-rose', hsl: '350 78% 97%' },
    { name: 'Light Mint', value: 'light-mint', hsl: '150 50% 96%' },
    { name: 'Light Peach', value: 'light-peach', hsl: '25 90% 96%' },
    { name: 'Ghost White', value: 'ghost-white', hsl: '225 100% 98%' },
];

const accentColorOptions = [
    { name: 'Default', value: 'default', hsl: '240 10% 40%' },
    { name: 'Sky Blue', value: 'sky-blue', hsl: '200 80% 70%' },
    { name: 'Soft Rose', value: 'soft-rose', hsl: '350 70% 70%' },
    { name: 'Sage Green', value: 'sage-green', hsl: '145 40% 60%' },
    { name: 'Lavender', value: 'lavender', hsl: '250 60% 75%' },
    { name: 'Gold', value: 'gold', hsl: '45 80% 60%' },
    { name: 'Coral', value: 'coral', hsl: '10 80% 65%' },
    { name: 'Indigo', value: 'indigo', hsl: '230 70% 60%' },
    { name: 'Mint', value: 'mint-accent', hsl: '160 60% 55%' },
    { name: 'Crimson', value: 'crimson', hsl: '340 80% 50%' },
];


const colorMap = colorOptions.reduce((acc, curr) => {
    acc[curr.value] = curr.hsl;
    return acc;
}, {} as Record<string, string>);

const defaultColors = {
    mainText: '240 10% 20%',
    mutedText: '240 10% 45%',
    invertedText: '0 0% 100%',
    accent: '240 10% 40%',
};

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const { toast } = useToast();
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    
    const [blurLevel, setBlurLevel] = useState(16);
    const [opacityLevel, setOpacityLevel] = useState(0.65);
    const [shadowBlur, setShadowBlur] = useState(20);
    const [shadowOpacity, setShadowOpacity] = useState(0.1);

    const [customAccent, setCustomAccent] = useState('#595973');

    useEffect(() => {
        const history = localStorage.getItem('backgroundImageHistory');
        if (history) setUploadedImages(JSON.parse(history));

        const glassSettings = localStorage.getItem('glassEffectSettings');
        if (glassSettings) {
            try {
                const { blur, opacity, shadowBlur, shadowOpacity } = JSON.parse(glassSettings);
                setBlurLevel(blur || 16);
                setOpacityLevel(opacity || 0.65);
                setShadowBlur(shadowBlur || 20);
                setShadowOpacity(shadowOpacity || 0.1);
            } catch (e) {
                console.error("Failed to parse glass settings from localStorage", e);
            }
        }
    }, []);
    
    function hexToHsl(hex: string): string {
        hex = hex.replace(/^#/, '');

        let r = parseInt(hex.substring(0, 2), 16) / 255;
        let g = parseInt(hex.substring(2, 4), 16) / 255;
        let b = parseInt(hex.substring(4, 6), 16) / 255;

        let cmin = Math.min(r, g, b),
            cmax = Math.max(r, g, b),
            delta = cmax - cmin,
            h = 0, s = 0, l = 0;

        if (delta == 0) h = 0;
        else if (cmax == r) h = ((g - b) / delta) % 6;
        else if (cmax == g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;

        h = Math.round(h * 60);
        if (h < 0) h += 360;
        l = (cmax + cmin) / 2;
        s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        s = +(s * 100).toFixed(1);
        l = +(l * 100).toFixed(1);

        return `${h} ${s}% ${l}%`;
    }

    const handleBackgroundChange = (type: 'color' | 'image', value: string) => {
        try {
            if (type === 'image') {
                if (!value || !value.startsWith('http')) {
                    toast({ title: 'Invalid URL', description: 'Please enter a valid image URL.', variant: 'destructive' });
                    return;
                }
                document.documentElement.classList.add('has-image-background');
                document.body.style.backgroundImage = `url('${value}')`;
            } else {
                document.documentElement.classList.remove('has-image-background');
                document.body.style.backgroundImage = 'none';
                if (value in colorMap) {
                    document.documentElement.style.setProperty('--background', colorMap[value]);
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
            .from(supabaseBucketName!)
            .upload(filePath, imageFile, { contentType: imageFile.type });

        if (uploadError) {
            toast({ title: 'Upload Error', description: uploadError.message, variant: 'destructive' });
            setUploading(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from(supabaseBucketName!)
            .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
            const newHistory = [...uploadedImages, urlData.publicUrl];
            setUploadedImages(newHistory);
            localStorage.setItem('backgroundImageHistory', JSON.stringify(newHistory));
            handleBackgroundChange('image', urlData.publicUrl);
        } else {
             toast({ title: 'Error', description: 'Could not get public URL for the uploaded image.', variant: 'destructive' });
        }
        
        setUploading(false);
        setImageFile(null); 
    };

    const handleDeleteImage = async (imageUrlToDelete: string) => {
        try {
            const url = new URL(imageUrlToDelete);
            const pathParts = url.pathname.split('/');
            const objectPath = pathParts.slice(pathParts.indexOf(supabaseBucketName!) + 1).join('/');

            if (!objectPath) throw new Error("Could not determine object path from URL.");

            const { error: deleteError } = await supabase.storage.from(supabaseBucketName!).remove([objectPath]);
            
            if(deleteError) throw deleteError;
            
            const newHistory = uploadedImages.filter(img => img !== imageUrlToDelete);
            setUploadedImages(newHistory);
            localStorage.setItem('backgroundImageHistory', JSON.stringify(newHistory));
            toast({ title: 'Success', description: 'Image deleted from history.' });

        } catch (error: any) {
            console.error("Failed to delete image:", error);
            toast({ title: 'Error', description: error.message || 'Could not delete image.', variant: 'destructive' });
        }
    };

    const handleEffectChange = (type: 'blur' | 'opacity' | 'shadowBlur' | 'shadowOpacity', value: number) => {
        let newBlur = blurLevel,
            newOpacity = opacityLevel,
            newShadowBlur = shadowBlur,
            newShadowOpacity = shadowOpacity;

        if (type === 'blur') {
            setBlurLevel(value);
            newBlur = value;
            document.documentElement.style.setProperty('--glass-blur', `${value}px`);
        } else if (type === 'opacity') {
            setOpacityLevel(value);
            newOpacity = value;
            document.documentElement.style.setProperty('--glass-opacity', value.toString());
        } else if (type === 'shadowBlur') {
            setShadowBlur(value);
            newShadowBlur = value;
            document.documentElement.style.setProperty('--shadow-blur', `${value}px`);
        } else if (type === 'shadowOpacity') {
            setShadowOpacity(value);
            newShadowOpacity = value;
            document.documentElement.style.setProperty('--shadow-opacity', value.toString());
        }
        localStorage.setItem('glassEffectSettings', JSON.stringify({ 
            blur: newBlur, 
            opacity: newOpacity,
            shadowBlur: newShadowBlur,
            shadowOpacity: newShadowOpacity
        }));
    };

    const handleColorChange = (storageKey: string, variable: string | string[], hslValue: string, toastMessage: string) => {
         try {
            if (Array.isArray(variable)) {
                variable.forEach(v => document.documentElement.style.setProperty(v, hslValue));
            } else {
                document.documentElement.style.setProperty(variable, hslValue);
            }
            localStorage.setItem(storageKey, hslValue);
            toast({ title: 'Success', description: `${toastMessage} color updated.` });
        } catch (e) {
            console.error(`Failed to apply ${toastMessage} color`, e);
            toast({ title: 'Error', description: `Could not apply ${toastMessage} color.`, variant: 'destructive' });
        }
    };
    
    const handleApplyCustomAccent = () => {
        const hslColor = hexToHsl(customAccent);
        handleColorChange('accentColor', ['--primary', '--ring'], hslColor, 'Accent');
    }

    const renderColorPalette = (
        options: { value: string; name: string; hsl: string }[],
        onSelect: (hsl: string) => void
    ) => (
        <div className="flex flex-wrap gap-3 mt-2">
            {options.map(color => (
                <button
                    key={color.value}
                    title={color.name}
                    className={cn("h-10 w-10 rounded-full border-2 bg-[--swatch-color]")}
                    style={{ '--swatch-color': `hsl(${color.hsl})` } as React.CSSProperties}
                    onClick={() => onSelect(color.hsl)}
                />
            ))}
        </div>
    );

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
                    <CardDescription>Customize the look and feel of your application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="background" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="background">Background</TabsTrigger>
                            <TabsTrigger value="effects">Glass Effects</TabsTrigger>
                            <TabsTrigger value="text">Text</TabsTrigger>
                            <TabsTrigger value="accent">Accents</TabsTrigger>
                        </TabsList>

                        <TabsContent value="background" className="mt-4 space-y-6">
                             <div>
                                <Label>Theme Color</Label>
                                <div className="flex flex-wrap gap-3 mt-2">
                                    {colorOptions.map(color => (
                                        <button 
                                            key={color.value}
                                            title={color.name}
                                            className={cn("h-10 w-10 rounded-full border-2", color.className)}
                                            onClick={() => handleBackgroundChange('color', color.value)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <Label>Background Image</Label>
                                <div className="space-y-4 mt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="imageUpload" className="text-sm font-normal text-muted-foreground">Upload a new background</Label>
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
                                    <div className="space-y-2">
                                        <Label htmlFor="imageUrl" className="text-sm font-normal text-muted-foreground">Or use image URL</Label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <Input 
                                                id="imageUrl"
                                                placeholder="https://images.unsplash.com/..." 
                                                value={imageUrl} 
                                                onChange={(e) => setImageUrl(e.target.value)} 
                                            />
                                            <Button onClick={() => handleBackgroundChange('image', imageUrl)} variant="outline" className="w-full sm:w-auto">Apply URL</Button>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleReset}>Reset to Default Color</Button>
                                </div>
                            </div>

                            <Separator />
                            
                            <div>
                                <Label className="flex items-center gap-2 mb-2">
                                    <History className="h-4 w-4" />
                                    <span>Upload History</span>
                                </Label>
                                {uploadedImages.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {uploadedImages.map((imgUrl) => (
                                            <div key={imgUrl} className="relative group aspect-video">
                                                <Image src={imgUrl} alt="Uploaded background" layout="fill" className="object-cover rounded-md" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                                    <Button size="sm" className="w-full" onClick={() => handleBackgroundChange('image', imgUrl)}>Set</Button>
                                                    <Button size="sm" variant="destructive" className="w-full" onClick={() => handleDeleteImage(imgUrl)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No images have been uploaded yet.</p>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="effects" className="mt-4 space-y-6">
                            <div className="space-y-3">
                                <Label>Background Blur ({blurLevel.toFixed(0)}px)</Label>
                                <Slider onValueChange={(val) => handleEffectChange('blur', val[0])} value={[blurLevel]} max={50} step={1} />
                            </div>
                             <div className="space-y-3">
                                <Label>Content Opacity ({opacityLevel.toFixed(2)})</Label>
                                <Slider onValueChange={(val) => handleEffectChange('opacity', val[0])} value={[opacityLevel]} max={1} step={0.05} />
                            </div>
                            <Separator/>
                            <div className="space-y-3">
                                <Label>Shadow Blur ({shadowBlur.toFixed(0)}px)</Label>
                                <Slider onValueChange={(val) => handleEffectChange('shadowBlur', val[0])} value={[shadowBlur]} max={80} step={1} />
                            </div>
                             <div className="space-y-3">
                                <Label>Shadow Opacity ({shadowOpacity.toFixed(2)})</Label>
                                <Slider onValueChange={(val) => handleEffectChange('shadowOpacity', val[0])} value={[shadowOpacity]} max={0.5} step={0.01} />
                            </div>
                        </TabsContent>
                        
                         <TabsContent value="text" className="mt-4 space-y-8">
                            <div>
                                <Label>Main Content Text</Label>
                                <p className="text-sm text-muted-foreground">Used for body text, titles, and general content.</p>
                                {renderColorPalette(darkTextColors, (hsl) => handleColorChange('mainTextColor', '--foreground', hsl, 'Main text'))}
                                <Button variant="link" size="sm" className="px-0" onClick={() => handleColorChange('mainTextColor', '--foreground', defaultColors.mainText, 'Main text')}>Reset</Button>
                            </div>
                             <Separator />
                             <div>
                                <Label>Muted Text</Label>
                                <p className="text-sm text-muted-foreground">Used for descriptions and less important text.</p>
                                {renderColorPalette(darkTextColors, (hsl) => handleColorChange('mutedTextColor', '--muted-foreground', hsl, 'Muted text'))}
                                <Button variant="link" size="sm" className="px-0" onClick={() => handleColorChange('mutedTextColor', '--muted-foreground', defaultColors.mutedText, 'Muted text')}>Reset</Button>
                            </div>
                             <Separator />
                             <div>
                                <Label>Inverted Text (on Buttons)</Label>
                                <p className="text-sm text-muted-foreground">Used for text on colored buttons and backgrounds.</p>
                                {renderColorPalette(lightTextColors, (hsl) => handleColorChange('invertedTextColor', ['--primary-foreground', '--destructive-foreground'], hsl, 'Inverted text'))}
                                 <Button variant="link" size="sm" className="px-0" onClick={() => handleColorChange('invertedTextColor', ['--primary-foreground', '--destructive-foreground'], defaultColors.invertedText, 'Inverted text')}>Reset</Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="accent" className="mt-4 space-y-6">
                             <div>
                                <Label>Accent Color</Label>
                                <p className="text-sm text-muted-foreground">Used for buttons, links, and other interactive elements.</p>
                                {renderColorPalette(accentColorOptions, (hsl) => handleColorChange('accentColor', ['--primary', '--ring'], hsl, 'Accent'))}
                                <Button variant="link" size="sm" className="px-0" onClick={() => handleColorChange('accentColor', ['--primary', '--ring'], defaultColors.accent, 'Accent')}>Reset</Button>
                            </div>
                             <Separator />
                             <div>
                                <Label>Custom Accent Color</Label>
                                 <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                                     <Input 
                                        type="color" 
                                        value={customAccent} 
                                        onChange={(e) => setCustomAccent(e.target.value)}
                                        className="p-1 h-12 w-24"
                                     />
                                     <div className="flex w-full sm:w-auto items-center gap-2">
                                        <Input
                                            value={customAccent}
                                            onChange={(e) => setCustomAccent(e.target.value)}
                                            className="w-full sm:w-28 font-mono"
                                        />
                                        <Button onClick={handleApplyCustomAccent}>Apply</Button>
                                     </div>
                                </div>
                             </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
