import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, getSettings, updateSettings, exportAllData, clearAttendanceHistory, factoryReset } from '@/lib/database';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraPreview, setCameraPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { preferences, updatePreferences } = useAuth();

  useEffect(() => {
    loadSettings();
    loadCameras();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      toast({ title: 'Error loading settings', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter(d => d.kind === 'videoinput'));
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
    }
  };

  const handleUpdateSettings = async (updates: Partial<Settings>) => {
    if (!settings) return;
    try {
      const updated = await updateSettings(updates);
      setSettings(updated);
      toast({ title: 'Settings saved' });
    } catch (error) {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    await updatePreferences({ theme });
    await handleUpdateSettings({ theme });
  };

  const startCameraPreview = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: settings?.selectedCamera ? { deviceId: settings.selectedCamera } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraPreview(true);
    } catch (error) {
      toast({ title: 'Failed to access camera', variant: 'destructive' });
    }
  };

  const stopCameraPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraPreview(false);
  };

  const handleExportAllData = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Data exported successfully' });
    } catch (error) {
      toast({ title: 'Failed to export data', variant: 'destructive' });
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearAttendanceHistory();
      toast({ title: 'Attendance history cleared' });
    } catch (error) {
      toast({ title: 'Failed to clear history', variant: 'destructive' });
    }
  };

  const handleFactoryReset = async () => {
    try {
      await factoryReset();
      toast({ title: 'System reset complete. Reloading...' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast({ title: 'Failed to reset system', variant: 'destructive' });
    }
  };

  if (isLoading || !settings) {
    return <div className="flex h-64 items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure system behavior and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Face Recognition Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Face Recognition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Recognition Threshold</Label>
                <span className="text-sm text-muted-foreground">{Math.round(settings.recognitionThreshold * 100)}%</span>
              </div>
              <Slider
                value={[settings.recognitionThreshold]}
                onValueCommit={([value]) => handleUpdateSettings({ recognitionThreshold: value })}
                min={0.3}
                max={0.9}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground mt-1">Higher = stricter matching</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Face Match Tolerance</Label>
                <span className="text-sm text-muted-foreground">{settings.faceMatchTolerance.toFixed(2)}</span>
              </div>
              <Slider
                value={[settings.faceMatchTolerance]}
                onValueCommit={([value]) => handleUpdateSettings({ faceMatchTolerance: value })}
                min={0.3}
                max={0.7}
                step={0.05}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Required Face Samples</Label>
                <span className="text-sm text-muted-foreground">{settings.requiredFaceSamples}</span>
              </div>
              <Slider
                value={[settings.requiredFaceSamples]}
                onValueCommit={([value]) => handleUpdateSettings({ requiredFaceSamples: value })}
                min={3}
                max={15}
                step={1}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Face Quality Checks</Label>
                <p className="text-xs text-muted-foreground">Check for blur, lighting</p>
              </div>
              <Switch
                checked={settings.enableFaceQualityCheck}
                onCheckedChange={(checked) => handleUpdateSettings({ enableFaceQualityCheck: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Camera Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Camera</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Camera Device</Label>
              <Select
                value={settings.selectedCamera || 'default'}
                onValueChange={(value) => handleUpdateSettings({ selectedCamera: value === 'default' ? '' : value })}
              >
                <SelectTrigger><SelectValue placeholder="Select camera" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Camera</SelectItem>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select
                value={settings.cameraResolution}
                onValueChange={(value: 'low' | 'medium' | 'high') => handleUpdateSettings({ cameraResolution: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (480p)</SelectItem>
                  <SelectItem value="medium">Medium (720p)</SelectItem>
                  <SelectItem value="high">High (1080p)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Mirror Camera</Label>
                <p className="text-xs text-muted-foreground">Flip horizontally</p>
              </div>
              <Switch
                checked={settings.mirrorCamera}
                onCheckedChange={(checked) => handleUpdateSettings({ mirrorCamera: checked })}
              />
            </div>

            <div className="pt-4 border-t">
              {cameraPreview ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full max-w-md rounded-lg border ${settings.mirrorCamera ? 'scale-x-[-1]' : ''}`}
                  />
                  <Button variant="outline" onClick={stopCameraPreview}>Stop Preview</Button>
                </div>
              ) : (
                <Button onClick={startCameraPreview}>Test Camera</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lateThreshold">Late Arrival Threshold</Label>
              <Input
                id="lateThreshold"
                type="time"
                value={settings.lateThreshold}
                onChange={(e) => handleUpdateSettings({ lateThreshold: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Students marked after this time are "Late"</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Scan Interval</Label>
                <span className="text-sm text-muted-foreground">{settings.scanInterval / 1000}s</span>
              </div>
              <Slider
                value={[settings.scanInterval]}
                onValueCommit={([value]) => handleUpdateSettings({ scanInterval: value })}
                min={1000}
                max={10000}
                step={500}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Duplicate Protection</Label>
                <p className="text-xs text-muted-foreground">Prevent multiple entries per day</p>
              </div>
              <Switch
                checked={settings.duplicateProtection}
                onCheckedChange={(checked) => handleUpdateSettings({ duplicateProtection: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Manual Override</Label>
                <p className="text-xs text-muted-foreground">Allow manual attendance</p>
              </div>
              <Switch
                checked={settings.allowManualOverride}
                onCheckedChange={(checked) => handleUpdateSettings({ allowManualOverride: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme & Data */}
        <Card>
          <CardHeader>
            <CardTitle>Theme & Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={preferences?.theme || 'system'} onValueChange={handleThemeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t space-y-3">
              <Button variant="outline" className="w-full" onClick={handleExportAllData}>
                Export All Data (JSON)
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-yellow-600">Clear Attendance History</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear History?</AlertDialogTitle>
                    <AlertDialogDescription>This will delete all attendance records. Students and settings will be kept.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearHistory}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">Factory Reset</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Factory Reset?</AlertDialogTitle>
                    <AlertDialogDescription>This will delete ALL data including students, attendance, users, and settings. This cannot be undone!</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFactoryReset} className="bg-destructive">Reset Everything</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
