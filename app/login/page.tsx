// app/login/page.tsx
import AuthTabs from "@/components/auth/AuthTabs";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Login - Taylor ",
  description: "Login to access the  Taylor management system",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-100 dark:bg-gray-800  rounded-lg">
            <Image
              src="/logo.png"
              alt="Taylor Logo"
              width={200}
              height={200}
              className="w-28 h-28 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Taylor Pro
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your Taylor business efficiently
          </p>
        </div>
        {/* Auth Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
          <AuthTabs />
        </div>
        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>
            © {new Date().getFullYear()} Taylor Management System. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
