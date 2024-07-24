"use client"

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const SignInSchema = z.object({
  email: z.string().email("Email is invalid..."),
  password: z.string().min(4)
})

const SignInForm = () => {
  const form = useForm<z.infer<typeof SignInSchema>>();
  
  const onsubmit = (data: z.infer<typeof SignInSchema>) => { };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onsubmit)}>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="email"  {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="password"  {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
};

export default SignInForm;    