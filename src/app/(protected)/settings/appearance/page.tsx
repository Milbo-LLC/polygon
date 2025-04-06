'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Large, Muted, Small } from '~/components/ui/typography';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';
import { CheckIcon, MoonIcon, SunIcon, ComputerIcon } from 'lucide-react';
import { cn } from '~/lib/utils';

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering theme options client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themeOptions = [
    {
      id: 'light',
      name: 'Light',
      icon: SunIcon,
      description: 'Light theme with warm orange accents'
    },
    {
      id: 'dark',
      name: 'Dark',
      icon: MoonIcon,
      description: 'Dark theme with warm orange accents'
    },
    {
      id: 'system',
      name: 'System',
      icon: ComputerIcon,
      description: 'Follow your system preferences'
    },
  ];

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-col justify-center w-full max-w-3xl mx-auto py-20">
        <div className="mb-6">
          <Large>Appearance</Large>
          <Muted>
            <Small>Customize how Polygon looks for you</Small>
          </Muted>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Choose the theme for your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.id;

                return (
                  <div key={option.id} className="relative">
                    <RadioGroupItem
                      value={option.id}
                      id={`theme-${option.id}`}
                      className="sr-only"
                    />
                    <Label
                      htmlFor={`theme-${option.id}`}
                      className={cn(
                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        isSelected && "border-primary"
                      )}
                    >
                      {isSelected && (
                        <CheckIcon className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
                      <Icon className="mb-3 h-6 w-6" />
                      <div className="font-medium">{option.name}</div>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {option.description}
                      </span>

                      <div
                        className={cn(
                          "mt-4 w-full h-24 rounded-md border",
                          option.id === 'dark' ? "bg-[hsl(25,10%,5%)] border-[hsl(25,20%,18%)]" : "bg-[hsl(25,0%,100%)] border-[hsl(25,20%,82%)]"
                        )}
                      >
                        <div
                          className={cn(
                            "m-2 h-3 w-3/4 rounded-sm",
                            option.id === 'dark' ? "bg-[hsl(25,96%,54%)]" : "bg-[hsl(25,96%,54%)]"
                          )}
                        />
                        <div
                          className={cn(
                            "mx-2 my-1 h-2 w-1/2 rounded-sm",
                            option.id === 'dark' ? "bg-[hsl(25,0%,60%)]" : "bg-[hsl(25,0%,40%)]"
                          )}
                        />
                        <div
                          className={cn(
                            "mx-2 my-1 h-2 w-1/4 rounded-sm",
                            option.id === 'dark' ? "bg-[hsl(25,0%,60%)]" : "bg-[hsl(25,0%,40%)]"
                          )}
                        />
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            <div className="mt-6">
              <Muted>
                Your theme preference is saved automatically. System theme will adapt based on your device settings.
              </Muted>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}