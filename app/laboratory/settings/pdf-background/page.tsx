// app/laboratory/settings/pdf-background/page.tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, Eye, Download, Copy, Palette } from "lucide-react";
import { CanvasFractalGrid } from "@/components/ui/canvas-fractal-grid";
import { toast } from "sonner";

interface GradientStop {
  color: string;
  position: number;
}

interface GradientConfig {
  stops: GradientStop[];
  centerX: number;
  centerY: number;
}

interface ConfigPreset {
  name: string;
  dotSize: number;
  dotSpacing: number;
  dotOpacity: number;
  gradientAnimationDuration: number;
  waveIntensity: number;
  waveRadius: number;
  dotColor: string;
  glowColor: string;
  enableNoise: boolean;
  noiseOpacity: number;
  enableMouseGlow: boolean;
  initialPerformance: "low" | "medium" | "high";
  enableGradient: boolean;
  gradients: GradientConfig[];
}

const defaultConfigs: Record<string, ConfigPreset> = {
  medical: {
    name: "Medical Professional",
    dotSize: 3,
    dotSpacing: 18,
    dotOpacity: 0.15,
    gradientAnimationDuration: 0,
    waveIntensity: 20,
    waveRadius: 150,
    dotColor: "rgba(59, 130, 246, 0.1)",
    glowColor: "rgba(59, 130, 246, 0.15)",
    enableNoise: true,
    noiseOpacity: 0.02,
    enableMouseGlow: false,
    initialPerformance: "high",
    enableGradient: true,
    gradients: [
      {
        stops: [
          { color: "rgba(59, 130, 246, 0.05)", position: 0 },
          { color: "rgba(147, 197, 253, 0.03)", position: 25 },
          { color: "rgba(219, 234, 254, 0.01)", position: 50 },
          { color: "transparent", position: 75 },
        ],
        centerX: 30,
        centerY: 30,
      },
    ],
  },
  minimal: {
    name: "Minimal Clean",
    dotSize: 2,
    dotSpacing: 25,
    dotOpacity: 0.1,
    gradientAnimationDuration: 0,
    waveIntensity: 0,
    waveRadius: 0,
    dotColor: "rgba(100, 116, 139, 0.08)",
    glowColor: "rgba(100, 116, 139, 0.1)",
    enableNoise: false,
    noiseOpacity: 0,
    enableMouseGlow: false,
    initialPerformance: "high",
    enableGradient: false,
    gradients: [],
  },
  vibrant: {
    name: "Vibrant Colors",
    dotSize: 4,
    dotSpacing: 15,
    dotOpacity: 0.2,
    gradientAnimationDuration: 0,
    waveIntensity: 30,
    waveRadius: 200,
    dotColor: "rgba(139, 92, 246, 0.12)",
    glowColor: "rgba(139, 92, 246, 0.18)",
    enableNoise: true,
    noiseOpacity: 0.03,
    enableMouseGlow: false,
    initialPerformance: "medium",
    enableGradient: true,
    gradients: [
      {
        stops: [
          { color: "rgba(139, 92, 246, 0.08)", position: 0 },
          { color: "rgba(192, 132, 252, 0.05)", position: 25 },
          { color: "rgba(233, 213, 255, 0.02)", position: 50 },
          { color: "transparent", position: 75 },
        ],
        centerX: 40,
        centerY: 60,
      },
      {
        stops: [
          { color: "rgba(34, 197, 94, 0.05)", position: 0 },
          { color: "rgba(187, 247, 208, 0.03)", position: 25 },
          { color: "rgba(220, 252, 231, 0.01)", position: 50 },
          { color: "transparent", position: 75 },
        ],
        centerX: 60,
        centerY: 40,
      },
    ],
  },
};

export default function PDFBackgroundSettingsPage() {
  const [activeConfig, setActiveConfig] =
    useState<keyof typeof defaultConfigs>("medical");
  const [config, setConfig] = useState(defaultConfigs.medical);
  const [configName, setConfigName] = useState("My Configuration");

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const loadPreset = (preset: keyof typeof defaultConfigs) => {
    setActiveConfig(preset);
    setConfig(defaultConfigs[preset]);
    setConfigName(defaultConfigs[preset].name);
  };

  const saveConfiguration = () => {
    // Save to localStorage or your backend
    const savedConfigs = JSON.parse(
      localStorage.getItem("pdfBackgroundConfigs") || "{}",
    );
    savedConfigs[configName] = config;
    localStorage.setItem("pdfBackgroundConfigs", JSON.stringify(savedConfigs));

    toast("Configuration Saved", {
      description: `"${configName}" has been saved successfully.`,
    });
  };

  const resetToDefault = () => {
    setConfig(defaultConfigs[activeConfig]);
    toast("Configuration Reset", {
      description: "Reset to default values.",
    });
  };

  const copyConfig = () => {
    const configStr = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(configStr);
    toast("Configuration Copied", {
      description: "Config copied to clipboard.",
    });
  };

  const exportConfig = () => {
    const configData = {
      name: configName,
      config: config,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pdf-background-${configName.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          PDF Background Settings
        </h1>
        <p className="text-muted-foreground">
          Customize the fractal grid background for your PDF reports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                Real-time preview of your PDF background configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-125 rounded-lg overflow-hidden border">
                <CanvasFractalGrid {...config} />
                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{configName}</h3>
                        <p className="text-sm text-white/80">
                          This is how your PDF background will appear
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.print()}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Print Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration Summary */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-gray-500">Dot Size</div>
                  <div className="font-medium">{config.dotSize}px</div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-gray-500">Dot Spacing</div>
                  <div className="font-medium">{config.dotSpacing}px</div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-gray-500">Opacity</div>
                  <div className="font-medium">
                    {config.dotOpacity.toFixed(2)}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-gray-500">Performance</div>
                  <div className="font-medium capitalize">
                    {config.initialPerformance}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Configuration */}
        <div className="space-y-6">
          {/* Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Presets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(defaultConfigs).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant={activeConfig === key ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() =>
                      loadPreset(key as keyof typeof defaultConfigs)
                    }
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Name */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Enter configuration name"
              />
            </CardContent>
          </Card>

          {/* Quick Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Dot Size</Label>
                <Slider
                  min={1}
                  max={10}
                  step={0.5}
                  value={[config.dotSize]}
                  onValueChange={([value]) => updateConfig("dotSize", value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Dot Spacing</Label>
                <Slider
                  min={10}
                  max={50}
                  step={1}
                  value={[config.dotSpacing]}
                  onValueChange={([value]) => updateConfig("dotSpacing", value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Opacity</Label>
                <Slider
                  min={0}
                  max={0.5}
                  step={0.05}
                  value={[config.dotOpacity]}
                  onValueChange={([value]) => updateConfig("dotOpacity", value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Gradient</Label>
                  <p className="text-sm text-gray-500">
                    Add gradient background
                  </p>
                </div>
                <Switch
                  checked={config.enableGradient}
                  onCheckedChange={(checked) =>
                    updateConfig("enableGradient", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Noise</Label>
                  <p className="text-sm text-gray-500">Add texture noise</p>
                </div>
                <Switch
                  checked={config.enableNoise}
                  onCheckedChange={(checked) =>
                    updateConfig("enableNoise", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={saveConfiguration}>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={resetToDefault}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button variant="outline" onClick={copyConfig}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Config
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={exportConfig}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Configuration
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Advanced Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>
            Fine-tune your background configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="colors">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="effects">Effects</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dot Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.dotColor}
                      onChange={(e) => updateConfig("dotColor", e.target.value)}
                      className="h-10 w-16 p-1"
                    />
                    <Input
                      value={config.dotColor}
                      onChange={(e) => updateConfig("dotColor", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Glow Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.glowColor}
                      onChange={(e) =>
                        updateConfig("glowColor", e.target.value)
                      }
                      className="h-10 w-16 p-1"
                    />
                    <Input
                      value={config.glowColor}
                      onChange={(e) =>
                        updateConfig("glowColor", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="effects" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Wave Intensity</Label>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[config.waveIntensity]}
                    onValueChange={([value]) =>
                      updateConfig("waveIntensity", value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Wave Radius</Label>
                  <Slider
                    min={0}
                    max={500}
                    step={10}
                    value={[config.waveRadius]}
                    onValueChange={([value]) =>
                      updateConfig("waveRadius", value)
                    }
                  />
                </div>
              </div>

              {config.enableNoise && (
                <div className="space-y-2">
                  <Label>Noise Opacity</Label>
                  <Slider
                    min={0}
                    max={0.1}
                    step={0.005}
                    value={[config.noiseOpacity]}
                    onValueChange={([value]) =>
                      updateConfig("noiseOpacity", value)
                    }
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="space-y-2">
                <Label>Performance Level</Label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((level) => (
                    <Button
                      key={level}
                      variant={
                        config.initialPerformance === level
                          ? "default"
                          : "outline"
                      }
                      onClick={() => updateConfig("initialPerformance", level)}
                      className="flex-1"
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Higher performance = smoother animation, but may impact PDF
                  generation speed
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
