"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Leaf } from "lucide-react";

export default function PrivacyPage() {
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
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              EcoRide Privacy Policy
            </h1>
            <p className="text-[10px] uppercase tracking-wider font-bold text-brand-green-400 mt-1">
              Enterprise Mobility Compliance &amp; Trust
            </p>
          </div>
        </div>

        {/* Policy document content */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-900 bg-slate-900/40 space-y-6 text-xs sm:text-sm leading-relaxed text-slate-350 select-text selection:bg-brand-green-500/30 selection:text-white">
          <div className="border-b border-slate-900 pb-4">
            <p><strong>Effective Date:</strong> August 09, 2026</p>
            <p><strong>Last Updated:</strong> August 09, 2026</p>
          </div>

          <p>
            EcoRide ("EcoRide", "we", "us", or "our") is an enterprise employee mobility and sustainability platform that enables employees of participating organizations to share rides, connect with colleagues, and measure the environmental impact of shared commuting.
          </p>

          <p>
            This Privacy Policy explains how EcoRide collects, uses, stores, protects, and shares personal information when you use the EcoRide platform, website, mobile application, and related services (collectively, the "Services").
          </p>

          <p>
            By using EcoRide, you acknowledge that you have read and understood this Privacy Policy.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">1. Who We Are</h2>
          <p>
            EcoRide is operated by <strong>Mindly Consulting</strong>.
          </p>
          <p>
            EcoRide may be provided to employees through their employer or participating organization ("Customer Organization").
          </p>
          <p>
            Depending on the deployment arrangement, the Customer Organization may act as a data controller, while EcoRide may act as a data processor/service provider. In other circumstances, EcoRide may act as a controller for certain information.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">2. Information We Collect</h2>
          <p>
            We collect only information reasonably necessary to provide and improve the Services.
          </p>

          <h3 className="font-bold text-white mt-4">A. Account and Identity Information</h3>
          <p>Depending on the Customer Organization's configuration, we may receive:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Full name, corporate email address, employee ID</li>
            <li>Department, designation, business unit, office location</li>
            <li>Profile photograph and corporate phone number</li>
          </ul>
          <p>Employees authenticate using their organization's Single Sign-On (SSO) system. EcoRide does not store your corporate passwords.</p>

          <h3 className="font-bold text-white mt-4">B. Ride Information</h3>
          <p>When you offer or join a ride, we may collect: pickup location, destination, date and time, route information, available seats, vehicle specifications, and ride completion/cancellation details.</p>

          <h3 className="font-bold text-white mt-4">C. Location Information</h3>
          <p>EcoRide processes location information necessary to facilitate ride matching and navigation. Where possible, EcoRide uses approximate coordinates rather than precise residential addresses to preserve privacy.</p>

          <h3 className="font-bold text-white mt-4">D. Communication Information</h3>
          <p>If the Services include ride-specific messaging, we process chat messages, communication timestamps, and attachments. Chat contents are strictly accessible to the ride participants and system administrators for compliance purposes.</p>

          <h3 className="font-bold text-white mt-4">E. ESG and Sustainability Information</h3>
          <p>EcoRide estimates environmental impact associated with shared commuting (CO₂ avoided, fuel saved, ESG credits earned). These are estimates based on configured environmental methodologies.</p>

          <h3 className="font-bold text-white mt-4">F. Device and Technical Information</h3>
          <p>We automatically collect technical data such as IP address, browser type, operating system, session information, and application error/security logs for cybersecurity and system improvements.</p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">3. How We Use Information</h2>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Authenticate employees and provide secure access</li>
            <li>Match employees and coordinate pickup/destination routes</li>
            <li>Calculate ESG sustainability credits and update leaderboards</li>
            <li>Maintain platform security, detect fraud, and comply with legal requirements</li>
          </ul>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">4. Corporate SSO</h2>
          <p>
            EcoRide integrates with the Customer Organization's enterprise identity providers (Microsoft Entra ID, Google Workspace, Okta, etc.). EcoRide does not require or store your credentials.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">5. How We Share Information</h2>
          <p><strong>We do not sell employee personal information.</strong></p>
          <p>Information is shared only with:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Your Customer Organization:</strong> For administrative, compliance, and corporate sustainability reporting.</li>
            <li><strong>Other Ride Participants:</strong> Basic contact, vehicle profile, and boarding location information is visible only to approved ride participants.</li>
            <li><strong>Service Providers:</strong> Cloud hosting, database, notification, and map API providers.</li>
          </ul>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">6. Location Privacy &amp; Employee Safety</h2>
          <p>
            Location privacy is critical. We avoid exposing precise residential addresses. Users must exercise appropriate judgment when carpooling. EcoRide does not guarantee the conduct or driving ability of any participant.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">7. Data Retention &amp; Security</h2>
          <p>
            We implement industry-standard safeguards (TLS encryption in transit, AES encryption at rest, secure tenant isolation) and retain information only for as long as necessary to comply with security, auditing, and corporate compliance regulations.
          </p>

          <hr className="border-slate-900 my-6" />

          <h2 className="text-base font-bold text-white tracking-tight">8. Contact Us</h2>
          <p>
            For questions, concerns, or privacy requests, please contact:
          </p>
          <p className="mt-2 text-white font-semibold">
            Mindly Consulting<br />
            Email: privacy@mindlyconsulting.com
          </p>
        </div>

      </div>
    </div>
  );
}
