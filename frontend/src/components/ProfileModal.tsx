"use client";

import React, { useState } from "react";
import { useAppState } from "../context/StateContext";
import { X, User, Phone, MapPin, Briefcase, Car, Shield, Check } from "lucide-react";

interface ProfileModalProps {
  onClose: () => void;
}

const AVATAR_OPTIONS = [
  "👨‍💻", "👩‍💼", "👩‍💻", "👨‍💼", "👨‍🎨", "👩‍🎨", "👨‍🔬", "👩‍🔬", "🦁", "🦊", "🌱", "🚀", "⚡", "🔋"
];

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { currentUser, updateProfile } = useAppState();

  // Local Form States
  const [name, setName] = useState(currentUser.name || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [office, setOffice] = useState(currentUser.office || "Building A");
  const [department, setDepartment] = useState(currentUser.department || "");
  const [designation, setDesignation] = useState(currentUser.designation || "");
  const [gender, setGender] = useState(currentUser.gender || "Other");
  const [avatar, setAvatar] = useState(currentUser.avatar || "👨‍💻");

  // Vehicle States
  const [hasVehicle, setHasVehicle] = useState(!!currentUser.vehicle);
  const [vModel, setVModel] = useState(currentUser.vehicle?.model || "");
  const [vType, setVType] = useState<"Electric" | "Hybrid" | "ICE (Gasoline)">(currentUser.vehicle?.type || "Electric");
  const [vCapacity, setVCapacity] = useState(currentUser.vehicle?.capacity || 4);
  const [vPlate, setVPlate] = useState(currentUser.vehicle?.plateNumber || "");

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedDetails: any = {
      name,
      phone,
      office,
      department,
      designation,
      gender,
      avatar
    };

    if (hasVehicle) {
      updatedDetails.vehicle = {
        model: vModel || "Generic Commute Car",
        type: vType,
        capacity: Number(vCapacity),
        plateNumber: vPlate || "ECO-RIDE"
      };
    } else {
      updatedDetails.vehicle = null;
    }

    setTimeout(() => {
      updateProfile(updatedDetails);
      setIsSaving(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-805/80 rounded-3xl p-6 shadow-2xl animate-scale-in my-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-green-500/10 text-brand-green-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Edit Profile</h3>
              <p className="text-[10px] text-slate-400">Modify your corporate card &amp; vehicle preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Select Avatar</label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-950/40 rounded-2xl border border-slate-800">
              {AVATAR_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`text-xl p-2 rounded-xl hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center ${
                    avatar === emoji
                      ? "bg-brand-green-500/10 border-2 border-brand-green-500 scale-110"
                      : "border border-transparent"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Core Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Display Name</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone Number</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">
                  <Phone className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Office Location</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">
                  <MapPin className="h-4 w-4" />
                </span>
                <select
                  value={office}
                  onChange={e => setOffice(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none"
                >
                  <option value="Building A">Building A</option>
                  <option value="Building B">Building B</option>
                  <option value="Building C">Building C</option>
                  <option value="Building D">Building D</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gender</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">
                  <Shield className="h-4 w-4" />
                </span>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Department</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">
                  <Briefcase className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                  placeholder="e.g. R&amp;D Engineering"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Designation</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">
                  <Briefcase className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                  placeholder="e.g. Lead Technical Architect"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Settings Toggle */}
          <div className="border-t border-slate-800 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Car className="h-4.5 w-4.5 text-brand-blue-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Do you host carpools? (Vehicle Info)</h4>
                  <p className="text-[9px] text-slate-400">Toggle on to fill in corporate vehicle specifications</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hasVehicle}
                onChange={e => setHasVehicle(e.target.checked)}
                className="h-4 w-4 text-brand-green-500 rounded border-slate-850 bg-slate-950 focus:ring-brand-green-500 cursor-pointer"
              />
            </div>

            {hasVehicle && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800 animate-fade-in">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    required
                    value={vModel}
                    onChange={e => setVModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                    placeholder="e.g. Tesla Model 3"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Plate Number</label>
                  <input
                    type="text"
                    required
                    value={vPlate}
                    onChange={e => setVPlate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                    placeholder="e.g. KA-03-ME-1234"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Vehicle Type</label>
                  <select
                    value={vType}
                    onChange={e => setVType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none"
                  >
                    <option value="Electric">⚡ Electric</option>
                    <option value="Hybrid">🍃 Hybrid</option>
                    <option value="ICE (Gasoline)">⛽ ICE (Gasoline)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Available Passenger Seats</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={8}
                    value={vCapacity}
                    onChange={e => setVCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
