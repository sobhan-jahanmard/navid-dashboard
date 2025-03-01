"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function DashboardNavigation() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = session?.user?.role === "SUPPORT";

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      current: pathname === "/dashboard",
    },
    {
      name: "Add Payment",
      href: "/dashboard/add",
      current: pathname === "/dashboard/add",
    },
  ];

  // Admin-only navigation items
  const adminNavigation = [
    {
      name: "Admin Panel",
      href: "/dashboard/admin",
      current: pathname === "/dashboard/admin",
    },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <a
                href="https://discord.gg/celestial"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-bold text-indigo-600"
              >
                Celestial Shop
              </a>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    item.current
                      ? "border-indigo-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}

              {isAdmin &&
                adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      item.current
                        ? "border-indigo-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {item.name}
                  </Link>
                ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div className="flex items-center space-x-4">
                {session?.user?.name && (
                  <span className="text-sm font-medium text-gray-700">
                    {session.user.name}
                  </span>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${isMobileMenuOpen ? "hidden" : "block"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className={`${isMobileMenuOpen ? "block" : "hidden"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={`${isMobileMenuOpen ? "block" : "hidden"} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`${
                item.current
                  ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              {item.name}
            </Link>
          ))}

          {isAdmin &&
            adminNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  item.current
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                {item.name}
              </Link>
            ))}
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="flex items-center px-4">
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">
                {session?.user?.name || session?.user?.username || "User"}
              </div>
              <div className="text-sm font-medium text-gray-500">
                {session?.user?.role || "user"}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
