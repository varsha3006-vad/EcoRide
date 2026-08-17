"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let setSyncErrorExternal: ((err: string | null) => void) | null = null;

let lastEmployees: any[] = [];
let lastRides: any[] = [];
let lastRequests: any[] = [];
let lastMessages: any[] = [];

const supabaseSync = {
  get: async (key: string) => {
    if (!supabase) return null;
    try {
      if (key === "employees") {
        const { data, error } = await supabase.from("ecoride_employees").select("*");
        if (error) throw error;
        lastEmployees = data || [];
        return data;
      }
      if (key === "rides") {
        const { data, error } = await supabase.from("ecoride_rides").select("*");
        if (error) throw error;
        lastRides = data || [];
        return data;
      }
      if (key === "requests") {
        const { data, error } = await supabase.from("ecoride_requests").select("*");
        if (error) throw error;
        lastRequests = data || [];
        return data;
      }
      if (key === "messages" || key.startsWith("messages_")) {
        const rideId = key.startsWith("messages_") ? key.replace("messages_", "") : null;
        let query = supabase.from("ecoride_messages").select("*");
        if (rideId) {
          query = query.eq("rideId", rideId);
        }
        const { data, error } = await query;
        if (error) throw error;
        if (data) {
          const otherMsgs = lastMessages.filter((m: any) => rideId ? m.rideId !== rideId : false);
          lastMessages = [...otherMsgs, ...data];
        }
        return data;
      }
      if (key === "audit_logs") {
        const { data, error } = await supabase.from("ecoride_audit_logs").select("*");
        if (error) throw error;
        return data;
      }

      // Fallback
      const { data, error } = await supabase
        .from("ecoride_state")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data ? data.value : null;
    } catch (e: any) {
      console.warn(`Supabase load error for key ${key}:`, e);
      return null;
    }
  },
  set: async (key: string, value: any) => {
    if (!supabase) return;
    try {
      if (key === "employees" && Array.isArray(value)) {
        const changed = value.filter(r => {
          const old = lastEmployees.find(o => o.id === r.id);
          return !old || JSON.stringify(old) !== JSON.stringify(r);
        });
        if (changed.length > 0) {
          const { error } = await supabase.from("ecoride_employees").upsert(changed);
          if (error) throw error;
        }
        lastEmployees = value;
        return;
      }
      if (key === "rides" && Array.isArray(value)) {
        const changed = value.filter(r => {
          const old = lastRides.find(o => o.id === r.id);
          return !old || JSON.stringify(old) !== JSON.stringify(r);
        });
        if (changed.length > 0) {
          const { error } = await supabase.from("ecoride_rides").upsert(changed);
          if (error) throw error;
        }
        lastRides = value;
        return;
      }
      if (key === "requests" && Array.isArray(value)) {
        const changed = value.filter(r => {
          const old = lastRequests.find(o => o.id === r.id);
          return !old || JSON.stringify(old) !== JSON.stringify(r);
        });
        if (changed.length > 0) {
          try {
            const { error } = await supabase.from("ecoride_requests").upsert(changed);
            if (error) throw error;
          } catch (upsertErr) {
            console.warn("Failed to upsert requests with deviationKm, retrying without it:", upsertErr);
            // Strip deviationKm and retry to avoid query failure if table is not migrated yet
            const strippedChanged = changed.map(({ deviationKm, ...rest }) => rest);
            const { error } = await supabase.from("ecoride_requests").upsert(strippedChanged);
            if (error) throw error;
          }
        }
        lastRequests = value;
        return;
      }
      if ((key === "messages" || key.startsWith("messages_")) && Array.isArray(value)) {
        const changed = value.filter(r => {
          const old = lastMessages.find(o => o.id === r.id);
          return !old || JSON.stringify(old) !== JSON.stringify(r);
        });
        if (changed.length > 0) {
          const { error } = await supabase.from("ecoride_messages").upsert(changed);
          if (error) throw error;
        }
        lastMessages = value;
        return;
      }
      if (key === "audit_logs" && Array.isArray(value)) {
        const { error } = await supabase.from("ecoride_audit_logs").upsert(value);
        if (error) throw error;
        return;
      }

      // Fallback
      const { error } = await supabase
        .from("ecoride_state")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (error) throw error;
    } catch (e: any) {
      console.warn(`Supabase save error for key ${key}:`, e);
    }
  },
  delete: async (key: string) => {
    if (!supabase) return;
    try {
      if (key.startsWith("messages_")) {
        const rideId = key.replace("messages_", "");
        const { error } = await supabase.from("ecoride_messages").delete().eq("rideId", rideId);
        if (error) throw error;
        lastMessages = lastMessages.filter(m => m.rideId !== rideId);
        return;
      }
      const { error } = await supabase
        .from("ecoride_state")
        .delete()
        .eq("key", key);
      if (error) throw error;
    } catch (e: any) {
      console.warn(`Supabase delete error for key ${key}:`, e);
    }
  }
};

// Types
export interface Employee {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  designation: string;
  office: string;
  phone?: string;
  vehicle?: {
    model: string;
    type: "Electric" | "Hybrid" | "ICE (Gasoline)";
    capacity: number;
    plateNumber: string;
  } | null;
  esgScore: number;
  carbonSaved: number; // in kg
  credits: number;
  rank: number;
  badgeIds: string[];
  gender?: "Male" | "Female" | "Other";
  notificationPrefs?: {
    rides: boolean;
    chat: boolean;
    leaderboard: boolean;
  };
  isHost?: boolean;
  registeredAt?: string;
}

export interface Ride {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostDept: string;
  hostRating: number;
  pickup: string;
  destination: string;
  departureTime: string;
  rideDate?: string; // YYYY-MM-DD — which day the ride runs
  vehicleModel: string;
  vehiclePlate: string;
  vehicleType: "Electric" | "Hybrid" | "ICE (Gasoline)";
  seatsAvailable: number;
  seatsTotal: number;
  recurring: boolean;
  detourRadius: number; // in km
  co2Saved: number; // in kg
  esgCredits: number;
  genderPref?: string;
  deptPref?: string;
  musicPref?: string;
  smokingPref?: string;
  luggageAllowed: boolean;
  status: "Created" | "Published" | "Started" | "Completed" | "Cancelled";
  passengers: string[]; // employeeIds
  womenOnly?: boolean;
  driverLat?: number;
  driverLng?: number;
  passengerLocations?: Record<string, { lat: number; lng: number }>; // passengerId -> live coords
  boardedPassengers?: string[]; // list of passengerIds who have confirmed boarding
  city?: string;
}

export interface RideRequest {
  id: string;
  rideId: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string;
  requesterDept: string;
  requesterRating: number;
  pickup: string;
  pickupLat?: number;
  pickupLng?: number;
  dropPoint: string;
  dropLat?: number;
  dropLng?: number;
  status: "Pending" | "Accepted" | "Rejected";
  timestamp: string;
  boardingPin?: string;
  deviationKm?: number;
}

export interface ChatMessage {
  id: string;
  rideId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  isLocation?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "request";
  read: boolean;
  link?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  details: string;
}

interface StateContextType {
  employees: Employee[];
  currentUser: Employee;
  switchUser: (employeeId: string) => void;
  role: "Employee" | "Admin";
  setRole: (role: "Employee" | "Admin") => void;
  rides: Ride[];
  requests: RideRequest[];
  messages: ChatMessage[];
  notifications: Notification[];
  auditLogs: SecurityAuditLog[];
  logSecurityEvent: (action: string, severity: "INFO" | "WARNING" | "CRITICAL", details: string, overrideUserId?: string, overrideEmail?: string) => void;
  badges: Badge[];
  leaderboard: Employee[];
  createRide: (ride: Omit<Ride, "id" | "hostId" | "hostName" | "hostAvatar" | "hostDept" | "hostRating" | "status" | "passengers" | "boardedPassengers"> & { womenOnly?: boolean }) => void;
  requestJoinRide: (rideId: string, pickup: string, pickupLat?: number, pickupLng?: number, dropPoint?: string, dropLat?: number, dropLng?: number, deviationKm?: number) => void;
  handleRequestResponse: (requestId: string, accept: boolean) => void;
  checkRideOverlap: (newDate: string | undefined, newTime: string, userId?: string, excludeRideId?: string) => { hasOverlap: boolean; overlappingRide?: Ride };
  confirmBoarding: (rideId: string, passengerId: string, enteredPin: string) => { success: boolean; message: string };
  sendMessage: (rideId: string, content: string, isLocation?: boolean) => void;
  startRide: (rideId: string) => void;
  completeRide: (rideId: string, ratings: { safety: number; comfort: number; punctuality: number }) => void;
  cancelRide: (rideId: string) => void;
  markNotificationsRead: (id?: string) => void;
  adminDeleteRide: (rideId: string) => void;
  adminDeactivateEmployee: (employeeId: string) => void;
  isLoggedIn: boolean;
  login: (email: string) => boolean;
  logout: () => void;
  isSupabaseConfigured: boolean;
  syncError: string | null;
  updateRideLocation: (rideId: string, lat: number, lng: number) => void;
  updatePassengerLocation: (rideId: string, passengerId: string, lat: number, lng: number) => void;
  updateNotificationPrefs: (prefs: { rides: boolean; chat: boolean; leaderboard: boolean }) => void;
  updateProfile: (updatedDetails: Partial<Employee>) => void;
  activeCity: string;
  setActiveCity: (city: string) => void;
  addNotification: (notif: Notification) => void;
  sendGlobalAnnouncement: (message: string) => Promise<void>;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

// Core Test Personas (The 5 real users replacing the dummy ones)
const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "eeeee999-e999-e999-e999-eeeeeeeeeeee",
    name: "System Admin",
    email: "admin@company.com",
    avatar: "🛡️",
    department: "Security & Compliance",
    designation: "System Administrator",
    office: "Building A",
    phone: "+919000000000",
    esgScore: 100,
    carbonSaved: 0,
    credits: 1000,
    rank: 1,
    badgeIds: [],
    gender: "Male"
  },
  {
    id: "eeeee111-e111-e111-e111-eeeeeeeeeeee",
    name: "Rahul",
    email: "rahul@company.com",
    avatar: "👨‍💻",
    department: "Engineering",
    designation: "Principal Architect",
    office: "Building B",
    phone: "+919687605862",
    vehicle: {
      model: "Tesla Model S",
      type: "Electric",
      capacity: 4,
      plateNumber: "CA-770EV"
    },
    esgScore: 85,
    carbonSaved: 120.40,
    credits: 640,
    rank: 1,
    badgeIds: [],
    gender: "Male"
  },
  {
    id: "eeeee222-e222-e222-e222-eeeeeeeeeeee",
    name: "Shail",
    email: "shail@company.com",
    avatar: "👨‍🎨",
    department: "Product Design",
    designation: "Lead Designer",
    office: "Building C",
    phone: "+919731848848",
    vehicle: {
      model: "Toyota Prius",
      type: "Hybrid",
      capacity: 4,
      plateNumber: "CA-102HY"
    },
    esgScore: 80,
    carbonSaved: 75.20,
    credits: 410,
    rank: 2,
    badgeIds: [],
    gender: "Male"
  },
  {
    id: "eeeee333-e333-e333-e333-eeeeeeeeeeee",
    name: "Leo",
    email: "leo@company.com",
    avatar: "👨‍💼",
    department: "Operations",
    designation: "Ops Coordinator",
    office: "Building B",
    phone: "+919036005050",
    vehicle: {
      model: "Honda Accord",
      type: "Hybrid",
      capacity: 5,
      plateNumber: "CA-338OP"
    },
    esgScore: 78,
    carbonSaved: 45.10,
    credits: 320,
    rank: 3,
    badgeIds: [],
    gender: "Male"
  },
  {
    id: "e-alex",
    name: "Alex",
    email: "alex@company.com",
    avatar: "👨‍💻",
    department: "Engineering",
    designation: "Principal Architect",
    office: "Building B",
    vehicle: {
      model: "Tesla Model S",
      type: "Electric",
      capacity: 4,
      plateNumber: "CA-770EV"
    },
    esgScore: 0,
    carbonSaved: 0,
    credits: 0,
    rank: 1,
    badgeIds: [],
    gender: "Male"
  },
  {
    id: "e-chris",
    name: "Chris",
    email: "chris@company.com",
    avatar: "👨‍🎨",
    department: "Product Design",
    designation: "Lead Designer",
    office: "Building C",
    vehicle: {
      model: "Toyota Prius",
      type: "Hybrid",
      capacity: 4,
      plateNumber: "CA-102HY"
    },
    esgScore: 0,
    carbonSaved: 0,
    credits: 0,
    rank: 1,
    badgeIds: [],
    gender: "Male"
  },
  {
    id: "e-bob",
    name: "Bob",
    email: "bob@company.com",
    avatar: "👨‍💼",
    department: "Operations",
    designation: "Ops Coordinator",
    office: "Building B",
    vehicle: {
      model: "Honda Accord",
      type: "Hybrid",
      capacity: 5,
      plateNumber: "CA-338OP"
    },
    esgScore: 0,
    carbonSaved: 0,
    credits: 0,
    rank: 1,
    badgeIds: [],
    gender: "Male"
  },
  {
    id: "e-dan",
    name: "Dan",
    email: "dan@company.com",
    avatar: "👨‍💻",
    department: "Product Management",
    designation: "Senior PM",
    office: "Building A",
    vehicle: {
      model: "Rivian R1T",
      type: "Electric",
      capacity: 5,
      plateNumber: "CA-990EV"
    },
    esgScore: 0,
    carbonSaved: 0,
    credits: 0,
    rank: 1,
    badgeIds: [],
    gender: "Male"
  },
  {
    id: "e-elle",
    name: "Elle",
    email: "elle@company.com",
    avatar: "👩‍💼",
    department: "Human Resources",
    designation: "HR Director",
    office: "Building A",
    vehicle: {
      model: "Tesla Model Y",
      type: "Electric",
      capacity: 4,
      plateNumber: "CA-889XG"
    },
    esgScore: 0,
    carbonSaved: 0,
    credits: 0,
    rank: 1,
    badgeIds: [],
    gender: "Female"
  },
  {
    id: "eeeee555-e555-e555-e555-eeeeeeeeeeee",
    name: "Varsha",
    email: "varsha@company.com",
    avatar: "👩‍💼",
    department: "Human Resources",
    designation: "HR Director",
    office: "Building A",
    phone: "+919687605863",
    vehicle: {
      model: "Tesla Model Y",
      type: "Electric",
      capacity: 4,
      plateNumber: "CA-889XG"
    },
    esgScore: 92,
    carbonSaved: 95.50,
    credits: 510,
    rank: 3,
    badgeIds: [],
    gender: "Female"
  }
];

const INITIAL_BADGES: Badge[] = [
  { id: "1", name: "Green Starter", description: "Completed first shared ride", icon: "🌱", color: "bg-emerald-500" },
  { id: "2", name: "Eco Driver", description: "Hosted 5 or more carpools", icon: "🚗", color: "bg-blue-500" },
  { id: "3", name: "Carbon Warrior", description: "Saved more than 100 kg CO₂", icon: "🛡️", color: "bg-teal-500" },
  { id: "4", name: "Climate Hero", description: "Ranked in top 10 on the Leaderboard", icon: "🏆", color: "bg-amber-500" },
  { id: "5", name: "Earth Guardian", description: "Perfect rating on 10+ consecutive trips", icon: "🌍", color: "bg-indigo-500" },
];

const INITIAL_RIDES: Ride[] = [];

const playNotificationSound = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    
    const audioCtx = new AudioCtx();
    
    // Premium Corporate Commute Chime (Double Sine Chime)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
    gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.25);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5 note
    gain2.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(audioCtx.currentTime + 0.12);
    osc2.stop(audioCtx.currentTime + 0.45);
  } catch (e) {
    console.warn("Audio Context playback blocked by browser/device settings:", e);
  }
};

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizePgArray = (arr: any): string[] => {
  if (Array.isArray(arr)) return arr;
  if (typeof arr === "string") {
    if (arr.startsWith("{") && arr.endsWith("}")) {
      const content = arr.slice(1, -1).trim();
      return content ? content.split(",").map(s => s.trim().replace(/^"|"$/g, '')) : [];
    }
  }
  return [];
};

const normalizeRide = (ride: any): Ride => {
  if (!ride) return ride;
  return {
    ...ride,
    passengers: normalizePgArray(ride.passengers),
    boardedPassengers: normalizePgArray(ride.boardedPassengers)
  };
};

const parseRideDateTime = (dateStr?: string, timeStr?: string): Date | null => {
  if (!timeStr) return null;
  const todayStr = getLocalDateString();
  const dateToUse = dateStr || todayStr;

  const [timePart, ampm] = timeStr.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const [year, month, day] = dateToUse.split("-").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string>("e-alex");
  const [role, setRoleState] = useState<"Employee" | "Admin">("Employee");
  const [rides, setRides] = useState<Ride[]>(INITIAL_RIDES);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "n-1",
      title: "Welcome to EcoRide 🌱",
      message: "Track your corporate carbon savings, earn ESG credits, and claim commuting rewards with colleagues.",
      timestamp: "Today, 12:00 PM",
      type: "success",
      read: false
    }
  ]);
  const [leaderboard, setLeaderboard] = useState<Employee[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [activeCity, setActiveCity] = useState<string>("Bangalore");

  const currentUserIdRef = useRef(currentUserId);
  const ridesRef = useRef(rides);
  const requestsRef = useRef(requests);
  const employeesRef = useRef(employees);
  const messagesRef = useRef(messages);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    ridesRef.current = rides;
  }, [rides]);

  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const logSecurityEvent = (
    action: string, 
    severity: "INFO" | "WARNING" | "CRITICAL", 
    details: string,
    overrideUserId?: string,
    overrideEmail?: string
  ) => {
    const activeUserId = overrideUserId || currentUserIdRef.current;
    const activeUser = employees.find(e => e.id === activeUserId);
    const activeUserEmail = overrideEmail || activeUser?.email || "anonymous@company.com";
    
    const newLog: SecurityAuditLog = {
      id: `log-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      userId: activeUserId,
      userEmail: activeUserEmail,
      action,
      severity,
      details
    };
    
    setAuditLogs(prev => {
      const updated = [newLog, ...prev];
      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_audit_logs", JSON.stringify(updated));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("audit_logs", updated);
      }
      return updated;
    });
  };

  // Idle Session Timeout Observer (SOC2 Technical Control)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let lastActivity = Date.now();
    const resetActivity = () => {
      lastActivity = Date.now();
      localStorage.setItem("ecoride_last_activity", String(lastActivity));
    };

    window.addEventListener("mousedown", resetActivity);
    window.addEventListener("keydown", resetActivity);
    window.addEventListener("scroll", resetActivity);
    window.addEventListener("touchstart", resetActivity);

    const checkInterval = setInterval(() => {
      const savedLast = Number(localStorage.getItem("ecoride_last_activity") || lastActivity);
      const loggedIn = localStorage.getItem("ecoride_is_logged_in") === "true";
      
      if (loggedIn && (Date.now() - savedLast > 30 * 60 * 1000)) { // 30 minutes
        logSecurityEvent("SESSION_TIMEOUT", "WARNING", "Session automatically terminated due to user inactivity (30m).");
        logout();
        
        addNotification({
          id: `n-timeout-${Date.now()}`,
          title: "Session Expired 🔒",
          message: "You have been logged out automatically due to 30 minutes of inactivity for SOC2 compliance security.",
          timestamp: "Just now",
          type: "warning",
          read: false
        });
      }
    }, 10000);

    return () => {
      window.removeEventListener("mousedown", resetActivity);
      window.removeEventListener("keydown", resetActivity);
      window.removeEventListener("scroll", resetActivity);
      window.removeEventListener("touchstart", resetActivity);
      clearInterval(checkInterval);
    };
  }, [isLoggedIn]);

  const login = (email: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split("@")[1];
    
    // Check whitelisted corporate domains
    const isAllowedDomain = ["company.com", "enterprise.org"].includes(domain);
    if (!isAllowedDomain) return false;

    // Cache the last logged-in email to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("ecoride_last_email", cleanEmail);
    }

    // Load active persona
    const foundUser = employees.find(e => e.email.toLowerCase() === cleanEmail);
    let resolvedUserId = "";

    if (foundUser) {
      setCurrentUserId(foundUser.id);
      resolvedUserId = foundUser.id;
    } else {
      // Create user fallback
      const newName = cleanEmail.split("@")[0].replace(/\./g, " ");
      const formattedName = newName.charAt(0).toUpperCase() + newName.slice(1);
      const newEmp: Employee = {
        id: `e-new-${Date.now()}`,
        name: formattedName,
        email: cleanEmail,
        avatar: "👤",
        department: "Operations",
        designation: "Associate",
        office: "Building A",
        esgScore: 0,
        carbonSaved: 0,
        credits: 0,
        rank: employees.length + 1,
        badgeIds: [],
        gender: "Other"
      };
      const updatedEmps = [...employees, newEmp];
      setEmployees(updatedEmps);
      employeesRef.current = updatedEmps;
      lastEmployees = updatedEmps;
      setCurrentUserId(newEmp.id);
      resolvedUserId = newEmp.id;
      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_employees", JSON.stringify(updatedEmps));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("employees", updatedEmps);
      }
    }
    
    setIsLoggedIn(true);
    if (cleanEmail === "admin@company.com") {
      setRoleState("Admin");
    } else {
      setRoleState("Employee");
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("ecoride_is_logged_in", "true");
      localStorage.setItem("ecoride_logged_in_user_id", resolvedUserId);
    }
    logSecurityEvent("USER_LOGIN", "INFO", `User successfully logged in. Mode: ${foundUser ? "Existing" : "Auto-Registration"}`, resolvedUserId, cleanEmail);
    return true;
  };

  const logout = () => {
    logSecurityEvent("USER_LOGOUT", "INFO", "User manually terminated their session.");
    setIsLoggedIn(false);
    setRoleState("Employee");
    if (typeof window !== "undefined") {
      localStorage.removeItem("ecoride_is_logged_in");
      localStorage.removeItem("ecoride_logged_in_user_id");
    }
  };


  const [isLoaded, setIsLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setSyncErrorExternal = setSyncError;
  }, []);

  // Restore login session synchronously on mount to prevent login-screen flickers
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedIsLoggedIn = localStorage.getItem("ecoride_is_logged_in") === "true";
      const savedUserId = localStorage.getItem("ecoride_logged_in_user_id");
      if (savedIsLoggedIn && savedUserId) {
        setIsLoggedIn(true);
        setCurrentUserId(savedUserId);
        if (savedUserId === "eeeee999-e999-e999-e999-eeeeeeeeeeee") {
          setRoleState("Admin");
        } else {
          setRoleState("Employee");
        }
      }
    }
  }, []);

  // 1. Initial Load (Supabase has priority, falls back to localStorage)
  useEffect(() => {
    const initializeData = async () => {
      console.log("🌐 EcoRide Sync Engine initialized.");
      console.log("🔗 Supabase Target URL:", SUPABASE_URL || "NOT CONFIGURED (Local Sandbox Mode)");
      console.log("🔑 Anon Key Active:", SUPABASE_ANON_KEY ? "YES (Cloud Active)" : "NO");
      
      let loadedRides = null;
      let loadedRequests = null;
      let loadedMessages = null;
      let loadedEmployees = null;

      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        console.log("🔌 Connecting to Supabase for shared data...");
        loadedRides = await supabaseSync.get("rides");
        loadedRequests = await supabaseSync.get("requests");
        loadedMessages = await supabaseSync.get("messages");
        loadedEmployees = await supabaseSync.get("employees");
      }

      let finalRides = loadedRides || [];
      if (!loadedRides && typeof window !== "undefined") {
        const savedRides = localStorage.getItem("ecoride_rides");
        if (savedRides) {
          try { finalRides = JSON.parse(savedRides); } catch (e) {}
        }
      }

      let finalRequests = loadedRequests || [];
      if (!loadedRequests && typeof window !== "undefined") {
        const savedRequests = localStorage.getItem("ecoride_requests");
        if (savedRequests) {
          try { finalRequests = JSON.parse(savedRequests); } catch (e) {}
        }
      }

      if (loadedMessages) {
        setMessages(loadedMessages);
      }

      let finalEmployees = loadedEmployees || INITIAL_EMPLOYEES;
      if (!loadedEmployees && typeof window !== "undefined") {
        const savedEmployees = localStorage.getItem("ecoride_employees");
        if (savedEmployees) {
          try { finalEmployees = JSON.parse(savedEmployees); } catch (e) {}
        }
      }

      // Merge and enforce correct mock profiles (phone numbers, names, vehicles, etc.) from INITIAL_EMPLOYEES
      finalEmployees = finalEmployees.map((emp: Employee) => {
        const initEmp = INITIAL_EMPLOYEES.find(i => i.id === emp.id);
        if (initEmp) {
          return {
            ...emp,
            name: initEmp.name,
            email: initEmp.email,
            avatar: initEmp.avatar,
            phone: initEmp.phone,
            vehicle: initEmp.vehicle,
            gender: initEmp.gender,
            department: initEmp.department,
            designation: initEmp.designation,
            office: initEmp.office
          };
        }
        return emp;
      });

      // Ensure any new mock personas (like Leo) that are missing from cache are added
      INITIAL_EMPLOYEES.forEach(initEmp => {
        if (!finalEmployees.some((e: Employee) => e.id === initEmp.id)) {
          finalEmployees.push(initEmp);
        }
      });

      // Self-healing migration to reset ESG scores and history
      if (typeof window !== "undefined") {
        const hasReset = localStorage.getItem("ecoride_esg_reset_v3");
        if (hasReset !== "true") {
          console.log("🛠️ Performing client-side self-healing ESG reset...");
          
          // Reset stats for all employees
          finalEmployees = finalEmployees.map((emp: Employee) => ({
            ...emp,
            esgScore: 0,
            carbonSaved: 0,
            credits: 0,
            badgeIds: []
          }));

          // Wipe all rides and requests
          finalRides = [];
          finalRequests = [];

          // Sync to localStorage
          localStorage.setItem("ecoride_rides", JSON.stringify(finalRides));
          localStorage.setItem("ecoride_requests", JSON.stringify(finalRequests));
          localStorage.setItem("ecoride_esg_reset_v3", "true");

          // Sync to Supabase
          if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            supabaseSync.set("employees", finalEmployees);
            supabaseSync.set("rides", finalRides);
            supabaseSync.set("requests", finalRequests);
          }
        }
      }

      setEmployees(finalEmployees);
      setRides(finalRides.map(normalizeRide));
      setRequests(finalRequests);

      setIsLoaded(true);
    };

    initializeData();
  }, []);



  // 1.5. Local storage event listener — cross-tab synchronization in Sandbox Mode
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "ecoride_rides" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const normalized = parsed.map(normalizeRide);
          setRides(normalized);
          ridesRef.current = normalized;
        } catch (err) {}
      }
      if (e.key === "ecoride_requests" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setRequests(parsed);
        } catch (err) {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 2. Real-time Supabase sync — WebSocket subscription (instant) + polling fallback
  useEffect(() => {
    if (!supabase) return;

    // Helper to apply incoming row to local state
    const applyRow = (key: string, value: any) => {
      if (!key || !value) return;
      if (key === "rides") {
        const normalized = value.map(normalizeRide);
        setRides(normalized);
        ridesRef.current = normalized;
        lastRides = normalized;
      } else if (key === "requests") {
        setRequests(value);
        lastRequests = value;
      } else if (key.startsWith("messages_")) {
        const rId = key.replace("messages_", "");
        setMessages(prev => {
          const otherMsgs = prev.filter((m: ChatMessage) => m.rideId !== rId);
          const updated = [...otherMsgs, ...value].sort((a: ChatMessage, b: ChatMessage) => a.id.localeCompare(b.id));
          lastMessages = updated;
          return updated;
        });
      }
    };

    // --- Supabase Realtime WebSocket subscriptions on normalized tables ---
    const channelRides = supabase
      .channel("rides-realtime")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "ecoride_rides" }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          setRides(prev => {
            const updated = [normalizeRide(payload.new), ...prev.filter(r => r.id !== payload.new.id)];
            ridesRef.current = updated;
            lastRides = updated;
            return updated;
          });
        } else if (payload.eventType === "UPDATE") {
          setRides(prev => {
            const updated = prev.map(r => r.id === payload.new.id ? normalizeRide(payload.new) : r);
            ridesRef.current = updated;
            lastRides = updated;
            return updated;
          });
        } else if (payload.eventType === "DELETE") {
          setRides(prev => {
            const updated = prev.filter(r => r.id !== payload.old.id);
            ridesRef.current = updated;
            lastRides = updated;
            return updated;
          });
        }
      })
      .subscribe();

    const channelRequests = supabase
      .channel("requests-realtime")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "ecoride_requests" }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          setRequests(prev => {
            const updated = [payload.new, ...prev.filter(r => r.id !== payload.new.id)];
            requestsRef.current = updated;
            lastRequests = updated;
            return updated;
          });
        } else if (payload.eventType === "UPDATE") {
          setRequests(prev => {
            const updated = prev.map(r => r.id === payload.new.id ? payload.new : r);
            requestsRef.current = updated;
            lastRequests = updated;
            return updated;
          });
        } else if (payload.eventType === "DELETE") {
          setRequests(prev => {
            const updated = prev.filter(r => r.id !== payload.old.id);
            requestsRef.current = updated;
            lastRequests = updated;
            return updated;
          });
        }
      })
      .subscribe();

    const channelEmployees = supabase
      .channel("employees-realtime")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "ecoride_employees" }, (payload: any) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          setEmployees(prev => {
            const updated = prev.map(r => r.id === payload.new.id ? payload.new : r);
            if (!prev.some(r => r.id === payload.new.id)) {
              updated.push(payload.new);
            }
            employeesRef.current = updated;
            lastEmployees = updated;
            return updated;
          });
        }
      })
      .subscribe();

    const channelMessages = supabase
      .channel("messages-realtime")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "ecoride_messages" }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          setMessages(prev => {
            const updated = [...prev.filter(m => m.id !== payload.new.id), payload.new]
              .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            messagesRef.current = updated;
            lastMessages = updated;
            return updated;
          });
        }
      })
      .subscribe();

    const channelAnnouncements = supabase
      .channel("announcements-realtime")
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "ecoride_announcements" }, (payload: any) => {
        addNotification({
          id: payload.new.id,
          title: payload.new.title,
          message: payload.new.message,
          timestamp: "Just now",
          type: "info",
          read: false
        });
      })
      .subscribe();

    // --- Fallback polling ---
    const pollDatabase = async () => {
      try {
        const ridesVal = await supabaseSync.get("rides");
        if (ridesVal) applyRow("rides", ridesVal);

        const reqVal = await supabaseSync.get("requests");
        if (reqVal) applyRow("requests", reqVal);

        // Messages for active rides
        const activeRides = ridesRef.current;
        const myActiveRideIds = activeRides
          .filter((r: Ride) => r.hostId === currentUserIdRef.current || r.passengers.includes(currentUserIdRef.current))
          .filter((r: Ride) => r.status !== "Completed" && r.status !== "Cancelled")
          .map((r: Ride) => r.id);
        for (const rId of myActiveRideIds) {
          const msgVal = await supabaseSync.get(`messages_${rId}`);
          if (msgVal) applyRow(`messages_${rId}`, msgVal);
        }
      } catch (e) {
        console.warn("Poll error:", e);
      }
    };

    // Poll every 2s regardless — ensures data stays in sync even without Realtime
    const interval = setInterval(pollDatabase, 2000);
    // Also run immediately on mount
    pollDatabase();

    return () => {
      supabase.removeChannel(channelRides);
      supabase.removeChannel(channelRequests);
      supabase.removeChannel(channelEmployees);
      supabase.removeChannel(channelMessages);
      supabase.removeChannel(channelAnnouncements);
      clearInterval(interval);
    };
  }, []);





  const prevRequestsRef = useRef<RideRequest[]>([]);
  const prevRidesRef = useRef<Ride[]>([]);

  // 4. Reactive State-Transition Notifications (Triggers cross-device notifications on data updates)
  useEffect(() => {
    if (!isLoaded) return;

    // Detect new requests for the host, or status updates for the passenger
    requests.forEach(req => {
      // A. Passenger gets notification if their request was accepted/declined
      if (req.requesterId === currentUserId) {
        if (req.status === "Accepted") {
          const hasNotif = notifications.some(n => n.id === `n-req-acc-${req.id}`);
          if (!hasNotif) {
            const ride = rides.find(r => r.id === req.rideId);
            addNotification({
              id: `n-req-acc-${req.id}`,
              title: "Ride Request Approved! 🎉",
              message: `${ride ? ride.hostName : "The host"} accepted your ride request. Ready to commute!`,
              timestamp: "Just now",
              type: "success",
              read: false
            });
          }
        } else if (req.status === "Rejected") {
          const hasNotif = notifications.some(n => n.id === `n-req-rej-${req.id}`);
          if (!hasNotif) {
            const ride = rides.find(r => r.id === req.rideId);
            addNotification({
              id: `n-req-rej-${req.id}`,
              title: "Ride Request Declined ❌",
              message: `${ride ? ride.hostName : "The host"} declined your join request.`,
              timestamp: "Just now",
              type: "warning",
              read: false
            });
          }
        }
      }

      // B. Host gets notification about pending requests from other users
      if (req.status === "Pending" && req.requesterId !== currentUserId) {
        const ride = rides.find(r => r.id === req.rideId);
        if (ride && ride.hostId === currentUserId) {
          const hasNotif = notifications.some(n => n.id === `n-new-req-${req.id}`);
          if (!hasNotif) {
            addNotification({
              id: `n-new-req-${req.id}`,
              title: `Ride Join Request from ${req.requesterName} ✉️`,
              message: `${req.requesterName} wants to join your ride to ${ride.destination}.`,
              timestamp: "Just now",
              type: "request",
              read: false
            });
          }
        }
      }
    });

    // Detect ride status changes (Started / Completed)
    rides.forEach(ride => {
      const prevRide = prevRidesRef.current.find(r => r.id === ride.id);
      if (prevRide && prevRide.status !== ride.status) {
        const isPassenger = ride.passengers.includes(currentUserId);
        const isHost = ride.hostId === currentUserId;
        
        // Notify passenger when host acts
        if (isPassenger && !isHost) {
          if (ride.status === "Started") {
            const hasNotif = notifications.some(n => n.id === `n-ride-start-${ride.id}-${ride.status}`);
            if (!hasNotif) {
              addNotification({
                id: `n-ride-start-${ride.id}-${ride.status}`,
                title: "Carpool Started! 🚗",
                message: `${ride.hostName} has started the commute to ${ride.destination}. Meet at your boarding point!`,
                timestamp: "Just now",
                type: "success",
                read: false
              });
            }
          } else if (ride.status === "Completed") {
            const hasNotif = notifications.some(n => n.id === `n-ride-comp-${ride.id}-${ride.status}`);
            if (!hasNotif) {
              addNotification({
                id: `n-ride-comp-${ride.id}-${ride.status}`,
                title: "Carpool Completed! 🌱",
                message: `You arrived at ${ride.destination}. ESG credits and CO₂ savings have been updated!`,
                timestamp: "Just now",
                type: "success",
                read: false
              });
            }
          }
        }
      }
    });

    // Update comparison cache refs
    prevRequestsRef.current = requests;
    prevRidesRef.current = rides;
  }, [requests, rides, isLoaded, currentUserId, notifications]);

  const currentUser = employees.find(e => e.id === currentUserId) || employees[0];

  // Switch identity
  const switchUser = (employeeId: string) => {
    const target = employees.find(e => e.id === employeeId);
    if (!target) return;
    
    setCurrentUserId(employeeId);
    
    addNotification({
      id: `n-sw-${Date.now()}`,
      title: `Switched User to ${target.name}`,
      message: `You are now simulating ${target.name} (${target.designation}).`,
      timestamp: "Just now",
      type: "info",
      read: false
    });
  };

  const setRole = (newRole: "Employee" | "Admin") => {
    setRoleState(newRole);
    addNotification({
      id: `n-role-${Date.now()}`,
      title: `Switched view to ${newRole}`,
      message: `You are now interacting as an ${newRole}.`,
      timestamp: "Just now",
      type: "info",
      read: false
    });
  };

  // Compile Leaderboard dynamically
  useEffect(() => {
    const sorted = [...employees].sort((a, b) => b.credits - a.credits);
    const updatedLeaderboard = sorted.map((emp, index) => ({
      ...emp,
      rank: index + 1
    }));
    setLeaderboard(updatedLeaderboard);
  }, [employees]);

  // Synchronize employees state to Supabase automatically
  useEffect(() => {
    if (!isLoaded) return;
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseSync.set("employees", employees);
    }
  }, [employees, isLoaded]);

  // Background Expiration Guard & Reminders check
  useEffect(() => {
    if (!isLoaded) return;

    const interval = setInterval(() => {
      const now = new Date();

      setRides(prevRides => {
        let changed = false;
        
        const updated = prevRides.map(ride => {
          if (ride.status !== "Published") return ride;

          const departureDate = parseRideDateTime(ride.rideDate, ride.departureTime);
          if (!departureDate) return ride;

          const diffMs = departureDate.getTime() - now.getTime();
          const diffMins = diffMs / (1000 * 60);

          // 1. Proactive Reminder (15 minutes before)
          const reminderKey = `rem_sent_${ride.id}`;
          if (diffMins > 0 && diffMins <= 15) {
            if (typeof window !== "undefined" && !sessionStorage.getItem(reminderKey)) {
              sessionStorage.setItem(reminderKey, "true");
              
              // Trigger notification to host
              addNotification({
                id: `rem-n-${Date.now()}`,
                title: "Commute Starting Soon! ⏱️",
                message: `Your ride to ${ride.destination} is scheduled to start in ${Math.round(diffMins)} minutes. Open EcoRide to start your trip.`,
                timestamp: "Just now",
                type: "info",
                read: false
              });

              try {
                triggerPushNotification(
                  ride.hostId,
                  "Commute Starting Soon! ⏱️",
                  `Your ride to ${ride.destination} is scheduled to start in ${Math.round(diffMins)} minutes. Open EcoRide to start.`
                );
              } catch (e) {}
            }
          }

          // 2. Expiration Guard (30 minutes after scheduled departure)
          if (diffMins <= -30) {
            changed = true;
            
            // Notify host
            addNotification({
              id: `exp-h-${Date.now()}`,
              title: "Commute Expired 🚫",
              message: `Your ride to ${ride.destination} has been cancelled due to inactivity (30 mins past departure time). 5 ESG credits deducted.`,
              timestamp: "Just now",
              type: "warning",
              read: false
            });

            // Penalize driver credits
            setEmployees(prevEmps => {
              const updatedEmps = prevEmps.map(emp => {
                if (emp.id === ride.hostId) {
                  return {
                    ...emp,
                    credits: Math.max(0, emp.credits - 5)
                  };
                }
                return emp;
              });
              if (typeof window !== "undefined") {
                localStorage.setItem("ecoride_employees", JSON.stringify(updatedEmps));
              }
              if (SUPABASE_URL && SUPABASE_ANON_KEY) {
                supabaseSync.set("employees", updatedEmps);
              }
              return updatedEmps;
            });

            // Notify accepted passengers
            const acceptedRequests = requests.filter(req => req.rideId === ride.id && req.status === "Accepted");
            acceptedRequests.forEach(req => {
              addNotification({
                id: `exp-p-${Date.now()}`,
                title: "Ride Cancelled by System 🚫",
                message: `The ride hosted by ${ride.hostName} to ${ride.destination} was cancelled due to no-show.`,
                timestamp: "Just now",
                type: "warning",
                read: false
              });

              try {
                triggerPushNotification(
                  req.requesterId,
                  "Ride Cancelled by System 🚫",
                  `The ride hosted by ${ride.hostName} to ${ride.destination} was cancelled due to no-show.`
                );
              } catch (e) {}
            });

            return {
              ...ride,
              status: "Cancelled" as const
            };
          }

          return ride;
        });

        if (changed) {
          if (typeof window !== "undefined") {
            localStorage.setItem("ecoride_rides", JSON.stringify(updated));
          }
          if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            supabaseSync.set("rides", updated);
          }
        }

        return updated;
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [requests, isLoaded]);

  const updateNotificationPrefs = (prefs: { rides: boolean; chat: boolean; leaderboard: boolean }) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === currentUserId) {
        return { ...emp, notificationPrefs: prefs };
      }
      return emp;
    }));
  };

  const addNotification = (notif: Notification) => {
    setNotifications(prev => [notif, ...prev]);
    playNotificationSound();
  };

  const checkRideOverlap = (
    newDate: string | undefined,
    newTime: string,
    userId?: string,
    excludeRideId?: string
  ): { hasOverlap: boolean; overlappingRide?: Ride } => {
    const targetUserId = userId || currentUserIdRef.current;
    const newDateTime = parseRideDateTime(newDate, newTime);
    if (!newDateTime) return { hasOverlap: false };

    // 1. Check hosted/confirmed rides
    for (const ride of ridesRef.current) {
      if (excludeRideId && ride.id === excludeRideId) continue;
      
      const statusLower = ride.status?.toLowerCase();
      if (statusLower === "completed" || statusLower === "cancelled") continue;

      const isUserInvolved = ride.hostId === targetUserId || (ride.passengers && ride.passengers.includes(targetUserId));
      if (!isUserInvolved) continue;

      const existingDateTime = parseRideDateTime(ride.rideDate, ride.departureTime);
      if (!existingDateTime) continue;

      const diffMs = Math.abs(newDateTime.getTime() - existingDateTime.getTime());
      const twoHoursMs = 2 * 60 * 60 * 1000;

      if (diffMs < twoHoursMs) {
        return { hasOverlap: true, overlappingRide: ride };
      }
    }

    // 2. Check pending or accepted requests to join
    for (const req of requestsRef.current) {
      if (excludeRideId && req.rideId === excludeRideId) continue;
      
      const reqStatusLower = req.status?.toLowerCase();
      if (req.requesterId === targetUserId && (reqStatusLower === "pending" || reqStatusLower === "accepted")) {
        const ride = ridesRef.current.find(r => r.id === req.rideId);
        if (ride) {
          const rideStatusLower = ride.status?.toLowerCase();
          if (rideStatusLower !== "completed" && rideStatusLower !== "cancelled") {
            const existingDateTime = parseRideDateTime(ride.rideDate, ride.departureTime);
            if (existingDateTime) {
              const diffMs = Math.abs(newDateTime.getTime() - existingDateTime.getTime());
              const twoHoursMs = 2 * 60 * 60 * 1000;
              if (diffMs < twoHoursMs) {
                return { hasOverlap: true, overlappingRide: ride };
              }
            }
          }
        }
      }
    }

    return { hasOverlap: false };
  };

  // Create Ride — write OUTSIDE setState callback to avoid race condition
  const createRide = (rideData: Omit<Ride, "id" | "hostId" | "hostName" | "hostAvatar" | "hostDept" | "hostRating" | "status" | "passengers" | "boardedPassengers"> & { womenOnly?: boolean }) => {
    const overlapResult = checkRideOverlap(rideData.rideDate, rideData.departureTime);
    if (overlapResult.hasOverlap) {
      addNotification({
        id: `n-overlap-${Date.now()}`,
        title: "Scheduling Overlap ⚠️",
        message: `You cannot host this ride because it overlaps with your scheduled ride to ${overlapResult.overlappingRide?.destination} at ${overlapResult.overlappingRide?.departureTime} (${overlapResult.overlappingRide?.rideDate}).`,
        timestamp: "Just now",
        type: "warning",
        read: false
      });
      return;
    }

    const newRide: Ride = {
      ...rideData,
      id: `r-${Date.now()}`,
      hostId: currentUser.id,
      hostName: currentUser.name,
      hostAvatar: currentUser.avatar,
      hostDept: currentUser.department,
      hostRating: 4.8,
      status: "Published",
      passengers: [],
      city: rideData.city || activeCity
    };

    // Use ref for current rides to avoid stale closure
    const updatedRides = [newRide, ...ridesRef.current];
    setRides(updatedRides);
    ridesRef.current = updatedRides;

    if (typeof window !== "undefined") {
      localStorage.setItem("ecoride_rides", JSON.stringify(updatedRides));
    }
    // Write to Supabase OUTSIDE setState — no race condition
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseSync.set("rides", updatedRides);
    }
    
    logSecurityEvent("RIDE_CREATE", "INFO", `Created ride ID: ${newRide.id} from ${newRide.pickup} to ${newRide.destination} (Seats: ${newRide.seatsTotal})`);

    // No upfront credits awarded for hosting alone. Credits earned on complete based on co-passengers.
    addNotification({
      id: `n-create-${Date.now()}`,
      title: "Ride Hosted Successfully 🚗",
      message: `Your ride from ${newRide.pickup} is published. Share it with colleagues to start offset tracking!`,
      timestamp: "Just now",
      type: "success",
      read: false
    });
  };

  // Helper to trigger push notification
  const triggerPushNotification = async (targetUserId: string, title: string, body: string, url = "/") => {
    try {
      const recipient = employees.find(e => e.id === targetUserId);
      const prefs = recipient?.notificationPrefs || { rides: true, chat: true, leaderboard: true };

      const isChat = title.includes("💬") || title.toLowerCase().includes("message");
      const isLeaderboard = title.toLowerCase().includes("leaderboard") || title.toLowerCase().includes("rank");
      const isRide = !isChat && !isLeaderboard;

      if (isChat && !prefs.chat) return;
      if (isRide && !prefs.rides) return;
      if (isLeaderboard && !prefs.leaderboard) return;

      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId, title, body, url }),
      });
    } catch (e) {
      console.warn("Failed to send push notification:", e);
    }
  };

  // Request to Join a Ride — write OUTSIDE setState callback
  const requestJoinRide = (
    rideId: string, 
    pickup: string, 
    pickupLat?: number, 
    pickupLng?: number,
    dropPoint?: string,
    dropLat?: number,
    dropLng?: number,
    deviationKm?: number
  ) => {
    const targetRide = rides.find(r => r.id === rideId);
    if (!targetRide) return;

    if (targetRide.womenOnly && currentUser.gender?.toLowerCase() !== "female") {
      addNotification({
        id: `n-gender-restrict-${Date.now()}`,
        title: "Joining Blocked ⚠️",
        message: "This ride is designated as Female-Only by the host.",
        timestamp: "Just now",
        type: "warning",
        read: false
      });
      return;
    }

    const overlapResult = checkRideOverlap(targetRide.rideDate, targetRide.departureTime);
    if (overlapResult.hasOverlap) {
      addNotification({
        id: `n-overlap-${Date.now()}`,
        title: "Scheduling Overlap ⚠️",
        message: `You cannot join this ride because it overlaps with your scheduled ride to ${overlapResult.overlappingRide?.destination} at ${overlapResult.overlappingRide?.departureTime} (${overlapResult.overlappingRide?.rideDate}).`,
        timestamp: "Just now",
        type: "warning",
        read: false
      });
      return;
    }

    const newRequest: RideRequest = {
      id: `req-${Date.now()}`,
      rideId,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      requesterAvatar: currentUser.avatar,
      requesterDept: currentUser.department,
      requesterRating: 4.9,
      pickup,
      pickupLat,
      pickupLng,
      dropPoint: dropPoint || targetRide.destination,
      dropLat,
      dropLng,
      status: "Pending",
      timestamp: "Just now",
      deviationKm
    };

    const updatedRequests = [newRequest, ...requests];
    setRequests(updatedRequests);
    requestsRef.current = updatedRequests;

    if (typeof window !== "undefined") {
      localStorage.setItem("ecoride_requests", JSON.stringify(updatedRequests));
    }
    // Write to Supabase OUTSIDE setState — no race condition
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseSync.set("requests", updatedRequests);
    }

    // Trigger push notification to host (Privacy Masked)
    triggerPushNotification(
      targetRide.hostId,
      `New Ride Join Request ✉️`,
      `A colleague wants to join your ride to ${targetRide.destination}.`
    );

    logSecurityEvent("RIDE_JOIN_REQUEST", "INFO", `Requested to join ride ID: ${rideId} at pickup: ${pickup}`);
  };

  // Respond to join request (Accept / Reject)
  const handleRequestResponse = (requestId: string, accept: boolean) => {
    const reqToRespond = requests.find(r => r.id === requestId);
    if (!reqToRespond) return;

    const targetRide = rides.find(r => r.id === reqToRespond.rideId);
    if (!targetRide) return;

    if (accept) {
      const overlapResult = checkRideOverlap(targetRide.rideDate, targetRide.departureTime, reqToRespond.requesterId, targetRide.id);
      if (overlapResult.hasOverlap) {
        addNotification({
          id: `n-overlap-requester-${Date.now()}`,
          title: "Overlap Detected ⚠️",
          message: `Cannot approve request. ${reqToRespond.requesterName} already has an overlapping scheduled ride.`,
          timestamp: "Just now",
          type: "warning",
          read: false
        });
        return;
      }
    }

    if (accept && targetRide.seatsAvailable <= 0) {
      addNotification({
        id: `n-fail-${Date.now()}`,
        title: "Acceptance Failed",
        message: "This ride has no available seats remaining.",
        timestamp: "Just now",
        type: "warning",
        read: false
      });
      return;
    }

    // 1. Update requests status & generate boarding PIN on acceptance
    const boardingPin = accept ? String(Math.floor(1000 + Math.random() * 9000)) : undefined;
    let updatedRequests = requests.map(req => {
      if (req.id === requestId) {
        return { 
          ...req, 
          status: accept ? ("Accepted" as const) : ("Rejected" as const),
          boardingPin
        };
      }
      return req;
    });

    let updatedRides = [...rides];

    if (accept) {
      // 2. Deduct available seats in target ride
      updatedRides = rides.map(ride => {
        if (ride.id !== reqToRespond.rideId) return ride;
        return {
          ...ride,
          seatsAvailable: ride.seatsAvailable - 1,
          passengers: [...ride.passengers, reqToRespond.requesterId]
        };
      });

      const newSeats = targetRide.seatsAvailable - 1;

      // System welcome message in chat (pushed directly to ride-specific channel database log)
      sendMessage(targetRide.id, `Carpool formed! ${targetRide.hostName} is riding with ${reqToRespond.requesterName}. Chat channel active!`);

      // Capacity Check: If full, decline other pending requesters
      if (newSeats === 0) {
        const otherRequestsForThisRide = requests.filter(r => r.rideId === targetRide.id && r.id !== requestId && r.status === "Pending");
        
        otherRequestsForThisRide.forEach((otherReq, idx) => {
          addNotification({
            id: `n-full-${Date.now()}-${otherReq.requesterId}-${idx}-${Math.random()}`,
            title: "Ride No Longer Available 🚗",
            message: `${targetRide.hostName}'s ride to ${targetRide.destination} is now full.`,
            timestamp: "Just now",
            type: "warning",
            read: false
          });
        });

        updatedRequests = updatedRequests.map(r => {
          if (r.rideId === targetRide.id && r.id !== requestId && r.status === "Pending") {
            return { ...r, status: "Rejected" as const };
          }
          return r;
        });
      }

      // Update employee metrics
      setEmployees(prev => prev.map(emp => {
        if (emp.id === targetRide.hostId) {
          return {
            ...emp,
            credits: emp.credits + 20,
            esgScore: Math.min(100, emp.esgScore + 3)
          };
        }
        if (emp.id === reqToRespond.requesterId) {
          return {
            ...emp,
            credits: emp.credits + 10,
            esgScore: Math.min(100, emp.esgScore + 1)
          };
        }
        return emp;
      }));
    }

    setRequests(updatedRequests);
    requestsRef.current = updatedRequests;
    if (typeof window !== "undefined") {
      localStorage.setItem("ecoride_requests", JSON.stringify(updatedRequests));
    }
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseSync.set("requests", updatedRequests);
    }

    setRides(updatedRides);
    ridesRef.current = updatedRides;
    if (typeof window !== "undefined") {
      localStorage.setItem("ecoride_rides", JSON.stringify(updatedRides));
    }
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseSync.set("rides", updatedRides);
    }

    // Trigger push notification to passenger (Privacy Masked)
    if (accept) {
      triggerPushNotification(
        reqToRespond.requesterId,
        "Ride Request Approved! 🎉",
        `Your ride request to ${targetRide.destination} was accepted. Ready to commute!`
      );
    } else {
      triggerPushNotification(
        reqToRespond.requesterId,
        "Ride Request Declined ❌",
        `Your ride request to ${targetRide.destination} was declined.`
      );
    }

    logSecurityEvent("RIDE_REQUEST_RESOLVED", "INFO", `Resolved join request ID: ${requestId} to: ${accept ? "Accepted" : "Rejected"} (Ride ID: ${reqToRespond.rideId})`);
  };

  // Send Message (Real-time and User-driven chat updates)
  const sendMessage = async (rideId: string, content: string, isLocation: boolean = false) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rideId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLocation
    };

    // Optimistically append locally
    setMessages(prev => [...prev, newMsg]);

    // Trigger push notifications to other participants
    const targetRideForMsg = rides.find(r => r.id === rideId);
    if (targetRideForMsg) {
      const recipients = [targetRideForMsg.hostId, ...targetRideForMsg.passengers].filter(id => id !== currentUser.id);
      recipients.forEach(targetId => {
        triggerPushNotification(
          targetId,
          `New message from ${currentUser.name} 💬`,
          content.length > 60 ? content.substring(0, 57) + "..." : content,
          `/?rideId=${rideId}`
        );
      });
    }

    // Explicit Fetch-Modify-Write to prevent sync clobbers
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const key = `messages_${rideId}`;
      const dbMsgs = await supabaseSync.get(key) || [];
      const updatedMsgs = [...dbMsgs];
      if (!updatedMsgs.some(m => m.id === newMsg.id)) {
        updatedMsgs.push(newMsg);
      }
      await supabaseSync.set(key, updatedMsgs);
      setMessages(prev => {
        const otherMsgs = prev.filter(m => m.rideId !== rideId);
        return [...otherMsgs, ...updatedMsgs].sort((a, b) => a.id.localeCompare(b.id));
      });
    }
  };

  // Start Ride
  const startRide = (rideId: string) => {
    setRides(prev => {
      const updated = prev.map(ride => {
        if (ride.id !== rideId) return ride;
        
        // Notify all passengers
        ride.passengers.forEach(pId => {
          addNotification({
            id: `n-st-${Date.now()}-${pId}`,
            title: "Ride Commute Started! 🚗💨",
            message: `${ride.hostName}'s vehicle is now en route to ${ride.destination}.`,
            timestamp: "Just now",
            type: "info",
            read: false
          });
        });

        return {
          ...ride,
          status: "Started" as const
        };
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_rides", JSON.stringify(updated));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("rides", updated);
      }

      // Trigger push notifications to all passengers
      const activeRide = prev.find(r => r.id === rideId);
      if (activeRide) {
        activeRide.passengers.forEach(pId => {
          triggerPushNotification(
            pId,
            "Ride Commute Started! 🚗💨",
            `${activeRide.hostName}'s vehicle is now en route to ${activeRide.destination}.`
          );
        });
      }

      return updated;
    });
  };

  // Complete Ride
  const completeRide = (rideId: string, ratings: { safety: number; comfort: number; punctuality: number }) => {
    setRides(prev => {
      const updated = prev.map(ride => {
        if (ride.id !== rideId) return ride;

        const totalPassengers = ride.passengers.length;
        const co2Offset = totalPassengers > 0 ? (ride.co2Saved * totalPassengers) : 0;
        const earnedCredits = totalPassengers > 0 ? (ride.esgCredits + (totalPassengers * 15)) : 0;

        // Award credits to the driver & passengers in the employees array
        setEmployees(prevEmps => prevEmps.map(emp => {
          const isDriver = emp.id === ride.hostId;
          const isPassenger = ride.passengers.includes(emp.id);

          if (isDriver) {
            const newCarbon = Number((emp.carbonSaved + co2Offset).toFixed(1));
            const newCredits = emp.credits + earnedCredits;
            
            // Badge achievements
            const updatedBadges = [...emp.badgeIds];
            if (totalPassengers > 0 && newCarbon >= 100 && !updatedBadges.includes("3")) {
              updatedBadges.push("3"); // Carbon Warrior
            }

            return {
              ...emp,
              carbonSaved: newCarbon,
              credits: newCredits,
              badgeIds: updatedBadges,
              esgScore: totalPassengers > 0 ? Math.min(100, emp.esgScore + 5) : emp.esgScore
            };
          } else if (isPassenger) {
            const newCarbon = Number((emp.carbonSaved + (ride.co2Saved)).toFixed(1));
            const newCredits = emp.credits + Math.round(earnedCredits * 0.5); // Passenger gets 50% credits share

            return {
              ...emp,
              carbonSaved: newCarbon,
              credits: newCredits,
              esgScore: totalPassengers > 0 ? Math.min(100, emp.esgScore + 3) : emp.esgScore
            };
          }
          return emp;
        }));

        addNotification({
          id: `n-comp-${Date.now()}`,
          title: totalPassengers > 0 ? "Ride Shared Successfully! 🎉" : "Ride Completed (Single Commute) 🚗",
          message: totalPassengers > 0
            ? `Ride to ${ride.destination} completed. Shared commute savings logged to ESG registries.`
            : `Ride to ${ride.destination} completed. No carbon offsets registered (commute was single-occupancy).`,
          timestamp: "Just now",
          type: "success",
          read: false
        });

        // Wipe chat room on completion
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
          supabaseSync.delete(`messages_${rideId}`);
        }
        setMessages(prev => prev.filter(m => m.rideId !== rideId));

        return {
          ...ride,
          status: "Completed" as const
        };
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_rides", JSON.stringify(updated));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("rides", updated);
      }
      return updated;
    });
  };

  // Cancel Ride
  const cancelRide = (rideId: string) => {
    setRides(prev => {
      const updated = prev.map(ride => {
        if (ride.id !== rideId) return ride;

        // Penalty for driver late cancellation
        setEmployees(prev => prev.map(emp => {
          if (emp.id !== ride.hostId) return emp;
          return {
            ...emp,
            credits: Math.max(0, emp.credits - 25),
            esgScore: Math.max(0, emp.esgScore - 5)
          };
        }));

        addNotification({
          id: `n-can-${Date.now()}`,
          title: "Ride Cancelled ⚠️",
          message: `${ride.hostName} cancelled the commute trip. 25 credit penalty applied.`,
          timestamp: "Just now",
          type: "warning",
          read: false
        });

        // Wipe chat room on cancellation
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
          supabaseSync.delete(`messages_${rideId}`);
        }
        setMessages(prev => prev.filter(m => m.rideId !== rideId));

        return {
          ...ride,
          status: "Cancelled" as const
        };
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_rides", JSON.stringify(updated));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("rides", updated);
      }
      return updated;
    });
  };

  const lastGpsSyncTimeRef = useRef<number>(0);

  // Update Ride Location Coordinates (for cross-device passenger tracking)
  const updateRideLocation = (rideId: string, lat: number, lng: number) => {
    setRides(prev => {
      const updated = prev.map(ride => {
        if (ride.id === rideId) {
          if (ride.driverLat === lat && ride.driverLng === lng) return ride;

          // Check proximity to accepted passengers to trigger arrival notifications
          const rideRequests = requests.filter(req => req.rideId === rideId && req.status === "Accepted");
          rideRequests.forEach(req => {
            if (req.pickupLat && req.pickupLng) {
              const distance = getOrthoDistance(lat, lng, req.pickupLat, req.pickupLng);
              if (distance <= 0.15) { // 150 meters
                const sentKey = `sent_arr_${rideId}_${req.requesterId}`;
                if (typeof window !== "undefined" && !sessionStorage.getItem(sentKey)) {
                  sessionStorage.setItem(sentKey, "true");
                  
                  // Trigger notification
                  addNotification({
                    id: `arr-${Date.now()}`,
                    title: "Your colleague has arrived! 🚗",
                    message: `Your colleague ${ride.hostName} has arrived at your pickup location: ${req.pickup}. Open EcoRide to view your boarding PIN.`,
                    timestamp: "Just now",
                    type: "info",
                    read: false
                  });

                  try {
                    triggerPushNotification(
                      req.requesterId,
                      "Your colleague has arrived! 🚗",
                      `Your colleague ${ride.hostName} is at your pickup location. Open EcoRide to see your boarding PIN.`
                    );
                  } catch (e) {}
                }
              }
            }
          });

          return { ...ride, driverLat: lat, driverLng: lng };
        }
        return ride;
      });

      const now = Date.now();
      if (now - lastGpsSyncTimeRef.current > 3000) {
        lastGpsSyncTimeRef.current = now;
        if (typeof window !== "undefined") {
          localStorage.setItem("ecoride_rides", JSON.stringify(updated));
        }
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
          supabaseSync.set("rides", updated);
        }
      }
      return updated;
    });
  };

  const lastPassengerGpsSyncRef = useRef<Record<string, number>>({});

  // Update Passenger Live Location Coordinates (broadcast to host's map)
  const updatePassengerLocation = (rideId: string, passengerId: string, lat: number, lng: number) => {
    setRides(prev => {
      const updated = prev.map(ride => {
        if (ride.id !== rideId) return ride;
        const existing = ride.passengerLocations?.[passengerId];
        if (existing?.lat === lat && existing?.lng === lng) return ride;
        return {
          ...ride,
          passengerLocations: {
            ...(ride.passengerLocations || {}),
            [passengerId]: { lat, lng }
          }
        };
      });

      // Throttle Supabase write per passenger to once every 5 seconds
      const now = Date.now();
      const lastSync = lastPassengerGpsSyncRef.current[passengerId] || 0;
      if (now - lastSync > 5000) {
        lastPassengerGpsSyncRef.current[passengerId] = now;
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
          supabaseSync.set("rides", updated);
        }
      }
      return updated;
    });
  };

  // Haversine Distance helper
  const getOrthoDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Confirm Boarding Action (Option B: Boarding PIN Exchange Verification)
  const confirmBoarding = (rideId: string, passengerId: string, enteredPin: string) => {
    const ride = rides.find(r => r.id === rideId);
    if (!ride) return { success: false, message: "Ride not found." };

    // Find the accepted request for this passenger
    const req = requests.find(r => r.rideId === rideId && r.requesterId === passengerId && r.status === "Accepted");
    if (!req) return { success: false, message: "Passenger request record not found." };

    if (req.boardingPin !== enteredPin.trim()) {
      return { success: false, message: "Incorrect boarding PIN. Please check the code on your colleague's device." };
    }

    setRides(prev => {
      const updated = prev.map(r => {
        if (r.id === rideId) {
          const currentBoarded = r.boardedPassengers || [];
          if (currentBoarded.includes(passengerId)) return r;
          return {
            ...r,
            boardedPassengers: [...currentBoarded, passengerId]
          };
        }
        return r;
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_rides", JSON.stringify(updated));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("rides", updated);
      }
      return updated;
    });

    addNotification({
      id: `boarded-${Date.now()}`,
      title: "Welcome Aboard! 🚗",
      message: `${req.requesterName} has boarded successfully. Have a safe green commute!`,
      timestamp: "Just now",
      type: "success",
      read: false
    });

    return { success: true, message: "Boarded successfully!" };
  };

  const markNotificationsRead = (id?: string) => {
    setNotifications(prev => prev.map(n => {
      if (id && n.id !== id) return n;
      return { ...n, read: true };
    }));
  };

  // Admin Delete Ride
  const adminDeleteRide = (rideId: string) => {
    setRides(prev => {
      const updated = prev.filter(r => r.id !== rideId);
      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_rides", JSON.stringify(updated));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("rides", updated);
      }
      return updated;
    });

    logSecurityEvent("ADMIN_RIDE_DELETE", "CRITICAL", `Administrator manually deleted ride ID: ${rideId}`);

    addNotification({
      id: `n-adm-del-${Date.now()}`,
      title: "Ride Moderated 🚫",
      message: `Ride ID ${rideId.slice(0, 8)} removed by administrator override.`,
      timestamp: "Just now",
      type: "warning",
      read: false
    });
  };

  // Admin Deactivate Employee
  const adminDeactivateEmployee = (employeeId: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== employeeId) return emp;
      return { ...emp, is_active: false };
    }));

    logSecurityEvent("ADMIN_USER_DEACTIVATE", "CRITICAL", `Administrator deactivated employee user ID: ${employeeId}`);

    addNotification({
      id: `n-adm-deac-${Date.now()}`,
      title: "User Account Suspended 🚫",
      message: `Employee ID ${employeeId} has been set to Inactive status.`,
      timestamp: "Just now",
      type: "warning",
      read: false
    });
  };

  // Send Global Announcement (Admin Broadcast)
  const sendGlobalAnnouncement = async (message: string) => {
    logSecurityEvent("ADMIN_BROADCAST", "INFO", `Administrator published global announcement: ${message.slice(0, 50)}...`);

    if (SUPABASE_URL && SUPABASE_ANON_KEY && supabase) {
      try {
        const { error } = await supabase.from("ecoride_announcements").insert({
          id: `ann-${Date.now()}`,
          title: "📢 Global Announcement",
          message: message,
          timestamp: new Date().toISOString(),
          type: "info"
        });
        if (error) throw error;
      } catch (err) {
        console.error("Failed to broadcast global announcement to Supabase:", err);
      }
    } else {
      // Local sandbox fallback
      addNotification({
        id: `ann-${Date.now()}`,
        title: "📢 Global Announcement",
        message: message,
        timestamp: "Just now",
        type: "info",
        read: false
      });
    }
  };

  // Update Profile Action
  const updateProfile = (updatedDetails: Partial<Employee>) => {
    setEmployees(prev => {
      const updated = prev.map(emp => {
        if (emp.id === currentUserId) {
          const merged = { ...emp, ...updatedDetails };
          // Dynamically compute isHost based on vehicle presence
          merged.isHost = !!(merged.vehicle && merged.vehicle.model);
          return merged;
        }
        return emp;
      });

      // Synchronously update the refs and global tracker to prevent sync timing anomalies
      employeesRef.current = updated;
      lastEmployees = updated;

      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_employees", JSON.stringify(updated));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("employees", updated);
      }
      return updated;
    });

    logSecurityEvent("PROFILE_UPDATE", "INFO", `Profile details updated: ${Object.keys(updatedDetails).join(", ")}`);

    addNotification({
      id: `n-prof-upd-${Date.now()}`,
      title: "Profile Updated Successfully! 👤",
      message: "Your changes have been saved to your corporate profile.",
      timestamp: "Just now",
      type: "success",
      read: false
    });
  };

  return (
    <StateContext.Provider
      value={{
        employees,
        currentUser,
        switchUser,
        role,
        setRole,
        rides,
        requests,
        messages,
        notifications,
        badges: INITIAL_BADGES,
        leaderboard,
        createRide,
        requestJoinRide,
        handleRequestResponse,
        checkRideOverlap,
        sendMessage,
        startRide,
        completeRide,
        cancelRide,
        markNotificationsRead,
        adminDeleteRide,
        adminDeactivateEmployee,
        isLoggedIn,
        login,
        logout,
        isSupabaseConfigured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
        syncError,
        updateRideLocation,
        updatePassengerLocation,
        updateNotificationPrefs,
        confirmBoarding,
        updateProfile,
        auditLogs,
        logSecurityEvent,
        activeCity,
        setActiveCity,
        addNotification,
        sendGlobalAnnouncement
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within a StateProvider");
  }
  return context;
};
