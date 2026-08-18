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

  // Multiple Vehicles list state
  const [vehiclesList, setVehiclesList] = useState<any[]>(currentUser.vehicles || []);

  // New Vehicle inputs form state
  const [newVModel, setNewVModel] = useState("");
  const [newVType, setNewVType] = useState<"Electric" | "Hybrid" | "ICE (Gasoline)">("Electric");
  const [newVCapacity, setNewVCapacity] = useState(4);
  const [newVPlate, setNewVPlate] = useState("");
  const [vError, setVError] = useState("");

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
      avatar,
      vehicles: vehiclesList
    };

    setTimeout(() => {
      updateProfile(updatedDetails);
      setIsSaving(false);
      onClose();
    }, 600);
  };
  const handleAddVehicle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newVModel.trim() || !newVPlate.trim()) {
      setVError("Please enter both the Vehicle Model and Plate Number.");
      return;
    }

    const cleanPlate = newVPlate.trim().toUpperCase();
    if (vehiclesList.some(v => v.plateNumber === cleanPlate)) {
      setVError("This plate number is already registered.");
      return;
    }

    const newVehicle = {
      model: newVModel.trim(),
      plateNumber: cleanPlate,
      type: newVType,
      capacity: Number(newVCapacity)
    };

    setVehiclesList(prev => [...prev, newVehicle]);
    setNewVModel("");
    setNewVPlate("");
    setNewVType("Electric");
    setNewVCapacity(4);
    setVError("");
  };

  const handleDeleteVehicle = (e: React.MouseEvent, plate: string) => {
    e.preventDefault();
    setVehiclesList(prev => prev.filter(v => v.plateNumber !== plate));
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
          <div className="border-t border-slate-800 pt-4 mt-2 space-y-4">
            <div className="flex items-center gap-2">
              <Car className="h-4.5 w-4.5 text-brand-blue-400" />
              <div>
                <h4 className="text-xs font-bold text-white">Manage Corporate Vehicles</h4>
                <p className="text-[9px] text-slate-400">Configure your registered vehicles for ride-sharing</p>
              </div>
            </div>

            {/* List of registered vehicles */}
            <div className="space-y-2">
              {vehiclesList.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-slate-950/20 border border-dashed border-slate-800 text-[10px] text-slate-400">
                  No vehicles registered. Add a vehicle below to enable carpool hosting.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {vehiclesList.map((veh) => {
                    const propulsionIcon = veh.type === "Electric" ? "⚡" : veh.type === "Hybrid" ? "🍃" : "⛽";
                    return (
                      <div key={veh.plateNumber} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg bg-slate-900 p-1.5 rounded-lg">{propulsionIcon}</span>
                          <div>
                            <h5 className="font-bold text-white">{veh.model} <span className="text-[9px] text-slate-500 font-normal">({veh.plateNumber})</span></h5>
                            <p className="text-[9px] text-slate-400 mt-0.5">{veh.type} • {veh.capacity} seats</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteVehicle(e, veh.plateNumber)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Vehicle"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Vehicle sub-form */}
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Add a Vehicle</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={newVModel}
                    onChange={e => setNewVModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-[11px] text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                    placeholder="e.g. Tesla Model 3"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Plate Number</label>
                  <input
                    type="text"
                    value={newVPlate}
                    onChange={e => setNewVPlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-[11px] text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                    placeholder="e.g. KA-03-ME-1234"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Propulsion Type</label>
                  <select
                    value={newVType}
                    onChange={e => setNewVType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-[11px] text-white focus:ring-1 focus:ring-brand-green-500 outline-none"
                  >
                    <option value="Electric">⚡ Electric</option>
                    <option value="Hybrid">🍃 Hybrid</option>
                    <option value="ICE (Gasoline)">⛽ ICE (Gasoline)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seats Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={newVCapacity}
                    onChange={e => setNewVCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-[11px] text-white focus:ring-1 focus:ring-brand-green-500 outline-none animate-none"
                  />
                </div>
              </div>

              {vError && (
                <p className="text-[9px] font-bold text-rose-500 text-center">{vError}</p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddVehicle}
                  className="px-3 py-1.5 rounded-xl bg-brand-green-600/10 hover:bg-brand-green-600/20 text-brand-green-400 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  ➕ Add Vehicle
                </button>
              </div>
            </div>
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
