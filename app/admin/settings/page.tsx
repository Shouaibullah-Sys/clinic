'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const { theme, setTheme } = useTheme();

  const handleSaveProfile = () => {
    console.log('Profile saved:', { userName, userEmail });
    alert('Profile saved successfully!');
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>

      <div className="space-y-6">
        {/* User Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="userName">Name</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label htmlFor="userEmail">Email</Label>
              <Input
                id="userEmail"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Enter your email"
                type="email"
              />
            </div>
            <Button onClick={handleSaveProfile}>Save Profile</Button>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="darkMode">Dark Mode</Label>
              <Switch
                id="darkMode"
                checked={theme === 'dark'}
                onCheckedChange={handleThemeToggle}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
