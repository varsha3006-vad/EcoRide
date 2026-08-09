"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Landmark, Leaf } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-350 select-none relative overflow-hidden py-12 px-4 sm:px-6">
      {/* Decorative background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-brand-green-500/10 blur-[120px] z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-brand-blue-500/10 blur-[120px] z-0"></div>

      <div className="max-w-3xl mx-auto relative z-10 space-y-8">
        
        {/* Navigation */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>

        {/* Branding header */}
        <div className="flex items-center gap-3 border-b border-slate-900 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-green-600 to-brand-blue-500 shadow-lg">
            <Landmark className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              EcoRide Terms of Service
            </h1>
            <p className="text-[10px] uppercase tracking-wider font-bold text-brand-green-400 mt-1">
              Enterprise Terms &amp; Compliance Guidelines
            </p>
          </div>
        </div>

        {/* Terms document content */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-900 bg-slate-900/40 space-y-6 text-xs sm:text-sm leading-relaxed text-slate-350 select-text selection:bg-brand-green-500/30 selection:text-white">
          <div className="border-b border-slate-900 pb-4">
            <p><strong>Effective Date:</strong> August 09, 2026</p>
            <p><strong>Last Updated:</strong> August 09, 2026</p>
          </div>

          <p>
            These Terms of Service ("Terms") govern your use of the EcoRide platform, website, mobile application, and related services ("Services").
          </p>

          <p>
            EcoRide provides an employee-focused ride-sharing and sustainability platform that enables employees of participating organizations to offer and join rides with colleagues and track estimated environmental impact.
          </p>

          <p>
            By accessing or using EcoRide, you agree to these Terms. If you do not agree with these Terms, you should not use the Services.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">1. Eligibility</h2>
          <p>
            EcoRide is intended for employees, contractors, or other authorized users of organizations participating in EcoRide.
          </p>
          <p>You must:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Have a valid authorized corporate account</li>
            <li>Use the Services only for legitimate purposes</li>
            <li>Provide accurate information and maintain the security of your account</li>
            <li>Follow applicable laws and company policies</li>
          </ul>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">2. Corporate Account and SSO</h2>
          <p>
            Access to EcoRide is provided through your employer's corporate identity system. You are responsible for maintaining the security of your corporate account, protecting authentication devices, and not sharing credentials. Access may automatically end when your employment or authorization with the Customer Organization ends.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">3. Employee Profile</h2>
          <p>
            You agree to provide accurate information. You must not impersonate another employee, use another person's account, provide false information, upload inappropriate content, or attempt to bypass authentication.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">4. Offering and Joining Rides</h2>
          <p>
            When offering a ride, hosts agree to provide reasonably accurate details (pickup, destination, available seats, departure time). When joining, passengers agree to respect other participants, arrive on time, and follow safety rules.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">5. Driver &amp; Vehicle Responsibility</h2>
          <p>
            Every user is an employee. Where an employee drives another employee, the driver is solely responsible for holding a valid license, maintaining legally required insurance, operating a roadworthy vehicle, and complying with traffic laws.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">6. Safety &amp; Prohibited Conduct</h2>
          <p>
            Users must behave respectfully and safely. Prohibited conduct includes harassment, dangerous driving, driving under the influence, violence, discrimination, or misuse of personal data. Report safety concerns immediately.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">7. Ratings &amp; Messaging</h2>
          <p>
            Ratings must be honest and based on genuine experience. Ride-related messaging must be used only for legitimate ride coordination.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">8. ESG Credits and Carbon Savings</h2>
          <p>
            EcoRide awards ESG credits based on configured sustainability rules. ESG credits have no cash value and are not transferable. Savings figures are estimates based on configured methodologies, not certified carbon offsets.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">9. Liability &amp; Suspension</h2>
          <p>
            EcoRide and its operators are not responsible for personal injury, vehicle accidents, unsafe driving, property damage, or user misconduct. Access may be suspended or terminated for violations of these Terms.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">10. Contact Us</h2>
          <p>
            For questions regarding these Terms, please contact:
          </p>
          <p className="mt-2 text-white font-semibold">
            Mindly Consulting<br />
            Email: legal@mindlyconsulting.com
          </p>
        </div>

      </div>
    </div>
  );
}
