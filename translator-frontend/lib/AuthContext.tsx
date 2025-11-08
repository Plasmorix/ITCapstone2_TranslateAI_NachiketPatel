"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase_client';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<{ error: any }>;
    signInWithGitHub: () => Promise<{ error: any }>;
    resetPassword: (email: string) => Promise<{ error: any }>;
    updateProfile: (fullName: string) => Promise<{ error: any }>;
    updatePassword: (newPassword: string) => Promise<{ error: any }>;
    deleteAccount: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, fullName: string) => {
        const redirectUrl = `${window.location.origin}/`;

        console.log('AuthContext: Attempting sign up for email:', email);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirectUrl,
                data: {
                    full_name: fullName,
                },
            },
        });

        console.log('AuthContext: Sign up response:', { data, error });

        if (error) {
            console.error('AuthContext: Sign up error:', error);
            toast.error(error.message);
        } else {
            console.log('AuthContext: Sign up successful, user:', data.user);
            if (data.user && !data.user.email_confirmed_at) {
                console.log('AuthContext: Email confirmation required');
            }
        }

        return { error };
    };

    const signIn = async (email: string, password: string) => {
        console.log('AuthContext: Attempting sign in for email:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        console.log('AuthContext: Sign in response:', { data, error });

        if (error) {
            console.error('AuthContext: Sign in error:', error);
            toast.error(error.message);
        } else {
            console.log('AuthContext: Sign in successful, user:', data.user);
        }

        return { error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error(error.message);
        }
    };

    const signInWithGoogle = async () => {
        const redirectUrl = `${window.location.origin}/dashboard`;
        console.log('AuthContext: Google OAuth redirect URL:', redirectUrl);
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) {
            console.error('AuthContext: Google sign in error:', error);
            toast.error(error.message);
        } else {
            console.log('AuthContext: Google sign in initiated with redirect:', redirectUrl);
        }

        return { error };
    };

    const signInWithGitHub = async () => {
        const redirectUrl = `${window.location.origin}/dashboard`;
        console.log('AuthContext: GitHub OAuth redirect URL:', redirectUrl);
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) {
            console.error('AuthContext: GitHub sign in error:', error);
            toast.error(error.message);
        } else {
            console.log('AuthContext: GitHub sign in initiated with redirect:', redirectUrl);
        }

        return { error };
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login`,
        });

        if (error) {
            toast.error(error.message);
        }

        return { error };
    };

    const updateProfile = async (fullName: string) => {
        const { error } = await supabase.auth.updateUser({
            data: { full_name: fullName },
        });

        if (error) {
            toast.error(error.message);
        }

        return { error };
    };

    const updatePassword = async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            toast.error(error.message);
        }

        return { error };
    };

    const deleteAccount = async () => {
        // Note: Supabase doesn't have a direct delete user method from client
        // This would typically need an Edge Function or admin SDK
        toast.error("Please contact support to delete your account.");
        return { error: new Error('Not implemented') };
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                signUp,
                signIn,
                signOut,
                signInWithGoogle,
                signInWithGitHub,
                resetPassword,
                updateProfile,
                updatePassword,
                deleteAccount,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
