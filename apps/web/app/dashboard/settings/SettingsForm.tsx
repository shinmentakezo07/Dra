"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, changePassword } from "@/app/lib/actions";
import { motion } from "framer-motion";

function SubmitButton({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    
    return (
        <button 
            type="submit" 
            disabled={pending}
            className="px-4 py-2 bg-[#3b82f6] text-black font-medium rounded-lg hover:bg-[#3b82f6]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? "Saving..." : children}
        </button>
    );
}

export function SettingsForm({ user }: { user: any }) {
    const [profileState, profileAction] = useActionState(updateProfile, { message: "", errors: {} } as any);
    const [passwordState, passwordAction] = useActionState(changePassword, { message: "" } as any);

    return (
        <div className="space-y-8">
            {/* Profile Section */}
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0A0A0A]/50 border border-white/5 rounded-2xl p-6"
            >
                <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
                
                <form action={profileAction} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-gray-400">Display Name</label>
                            <input 
                                type="text" 
                                name="name" 
                                id="name" 
                                defaultValue={user.name}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                            />
                             {profileState?.errors?.name && (
                                <p className="text-red-400 text-xs">{profileState.errors.name[0]}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-gray-400">Email Address</label>
                            <input 
                                type="email" 
                                name="email" 
                                id="email" 
                                defaultValue={user.email}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                            />
                             {profileState?.errors?.email && (
                                <p className="text-red-400 text-xs">{profileState.errors.email[0]}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4">
                         {profileState?.message && (
                            <p className={`text-sm ${profileState.message.includes("success") ? "text-[#3b82f6]" : "text-red-400"}`}>
                                {profileState.message}
                            </p>
                        )}
                        {!profileState?.message && <span />} 
                        <SubmitButton>Save Changes</SubmitButton>
                    </div>
                </form>
            </motion.section>

            {/* Password Section */}
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#0A0A0A]/50 border border-white/5 rounded-2xl p-6"
            >
                <h2 className="text-xl font-semibold text-white mb-6">Change Password</h2>
                
                <form action={passwordAction} className="space-y-4">
                     <div className="space-y-2">
                        <label htmlFor="currentPassword" className="text-sm font-medium text-gray-400">Current Password</label>
                        <input 
                            type="password" 
                            name="currentPassword" 
                            id="currentPassword" 
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="newPassword" className="text-sm font-medium text-gray-400">New Password</label>
                            <input 
                                type="password" 
                                name="newPassword" 
                                id="newPassword" 
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-400">Confirm New Password</label>
                            <input 
                                type="password" 
                                name="confirmPassword" 
                                id="confirmPassword" 
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                         {passwordState?.message && (
                            <p className={`text-sm ${passwordState.message.includes("success") ? "text-[#3b82f6]" : "text-red-400"}`}>
                                {passwordState.message}
                            </p>
                        )}
                        {!passwordState?.message && <span />}
                        <SubmitButton>Update Password</SubmitButton>
                    </div>
                </form>
            </motion.section>
        </div>
    );
}
