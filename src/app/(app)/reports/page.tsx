import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ReportsPage() {
    return (
        <div className="flex justify-center items-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="flex flex-col items-center gap-4">
                        <FileText className="h-12 w-12 text-primary" />
                        <span>Financial Reports</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Select a report from the sidebar to view detailed financial data, visualizations, and insights for your cafe.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
