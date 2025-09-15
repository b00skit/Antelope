'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, KeyRound, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  token: z.string().min(1, 'Setup token is required.'),
});

export function SetupClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: values.token }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }

      toast({
        title: 'Setup Complete!',
        description: 'You have been granted superadmin privileges.',
      });

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      form.setError('root', { message: err.message });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">Initial Setup</CardTitle>
          <CardDescription>
            Enter the setup token from your `.env` file to grant your account superadmin privileges. This can only be done once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your secret token" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Setup Failed</AlertTitle>
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
