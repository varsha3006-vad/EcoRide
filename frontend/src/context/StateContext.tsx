"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseSync = {
  get: async (key: string) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ecoride_state?key=eq.${key}&select=value`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.length > 0 ? data[0].value : null;
    } catch (e) {
      console.warn("Supabase load error:", e);
      return null;
    }
  },
  set: async (key: string, value: any) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/ecoride_state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
      });
    } catch (e) {
      console.warn("Supabase save error:", e);
    }
  },
  delete: async (key: string) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/ecoride_state?key=eq.${key}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
    } catch (e) {
      console.warn("Supabase delete error:", e);
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
  vehicle?: {
    model: string;
    type: "Electric" | "Hybrid" | "ICE (Gasoline)";
    capacity: number;
    plateNumber: string;
  };
  esgScore: number;
  carbonSaved: number; // in kg
  credits: number;
  rank: number;
  badgeIds: string[];
  gender?: "Male" | "Female" | "Other";
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
  status: "Pending" | "Accepted" | "Rejected";
  timestamp: string;
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
  badges: Badge[];
  leaderboard: Employee[];
  createRide: (ride: Omit<Ride, "id" | "hostId" | "hostName" | "hostAvatar" | "hostDept" | "hostRating" | "status" | "passengers"> & { womenOnly?: boolean }) => void;
  requestJoinRide: (rideId: string, pickup: string) => void;
  handleRequestResponse: (requestId: string, accept: boolean) => void;
  sendMessage: (rideId: string, content: string, isLocation?: boolean) => void;
  startRide: (rideId: string) => void;
  completeRide: (rideId: string, ratings: { safety: number; comfort: number; punctuality: number }) => void;
  cancelRide: (rideId: string) => void;
  markNotificationsRead: () => void;
  adminDeleteRide: (rideId: string) => void;
  adminDeactivateEmployee: (employeeId: string) => void;
  isLoggedIn: boolean;
  login: (email: string) => boolean;
  logout: () => void;
  isSupabaseConfigured: boolean;
  updateRideLocation: (rideId: string, lat: number, lng: number) => void;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

// Core Test Personas (The 5 real users replacing the dummy ones)
const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "e-rahul",
    name: "Rahul",
    email: "rahul@company.com",
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
    esgScore: 85,
    carbonSaved: 120.4,
    credits: 640,
    rank: 2,
    badgeIds: ["1", "2", "3"],
    gender: "Male"
  },
  {
    id: "e-shail",
    name: "Shail",
    email: "shail@company.com",
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
    esgScore: 80,
    carbonSaved: 75.2,
    credits: 410,
    rank: 4,
    badgeIds: ["1", "2"],
    gender: "Male"
  },
  {
    id: "e-leo",
    name: "Leo",
    email: "leo@company.com",
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
    esgScore: 78,
    carbonSaved: 45.1,
    credits: 320,
    rank: 5,
    badgeIds: ["1"],
    gender: "Male"
  },
  {
    id: "e-naveen",
    name: "Naveen",
    email: "naveen@company.com",
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
    esgScore: 88,
    carbonSaved: 160.8,
    credits: 780,
    rank: 1,
    badgeIds: ["1", "2", "3", "4"],
    gender: "Male"
  },
  {
    id: "e-varsha",
    name: "Varsha",
    email: "varsha@company.com",
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
    esgScore: 92,
    carbonSaved: 95.5,
    credits: 510,
    rank: 3,
    badgeIds: ["1", "3", "5"],
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

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const login = (email: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split("@")[1];
    
    // Check whitelisted corporate domains
    const isAllowedDomain = ["company.com", "enterprise.org"].includes(domain);
    if (!isAllowedDomain) return false;

    // Load active persona
    const foundUser = employees.find(e => e.email.toLowerCase() === cleanEmail);
    if (foundUser) {
      setCurrentUserId(foundUser.id);
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
        esgScore: 80,
        carbonSaved: 0,
        credits: 100,
        rank: employees.length + 1,
        badgeIds: ["1"],
        gender: "Other"
      };
      setEmployees(prev => [...prev, newEmp]);
      setCurrentUserId(newEmp.id);
    }
    
    setIsLoggedIn(true);
    return true;
  };

  const logout = () => {
    setIsLoggedIn(false);
  };
  const [currentUserId, setCurrentUserId] = useState<string>("e-rahul");
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

  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Initial Load (Supabase has priority, falls back to localStorage)
  useEffect(() => {
    const initializeData = async () => {
      console.log("🌐 EcoRide Sync Engine initialized.");
      console.log("🔗 Supabase Target URL:", SUPABASE_URL || "NOT CONFIGURED (Local Sandbox Mode)");
      console.log("🔑 Anon Key Active:", SUPABASE_ANON_KEY ? "YES (Cloud Active)" : "NO");
      
      let loadedRides = null;
      let loadedRequests = null;
      let loadedMessages = null;

      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        console.log("🔌 Connecting to Supabase for shared data...");
        loadedRides = await supabaseSync.get("rides");
        loadedRequests = await supabaseSync.get("requests");
        loadedMessages = await supabaseSync.get("messages");
      }

      if (loadedRides) {
        setRides(loadedRides);
      } else if (typeof window !== "undefined") {
        const savedRides = localStorage.getItem("ecoride_rides");
        if (savedRides) {
          try { setRides(JSON.parse(savedRides)); } catch (e) {}
        }
      }

      if (loadedRequests) {
        setRequests(loadedRequests);
      } else if (typeof window !== "undefined") {
        const savedRequests = localStorage.getItem("ecoride_requests");
        if (savedRequests) {
          try { setRequests(JSON.parse(savedRequests)); } catch (e) {}
        }
      }

      if (loadedMessages) {
        setMessages(loadedMessages);
      }

      setIsLoaded(true);
    };

    initializeData();
  }, []);

  const currentUserIdRef = useRef(currentUserId);
  const ridesRef = useRef(rides);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    ridesRef.current = rides;
  }, [rides]);

  // 2. Real-time polling updates from Supabase (every 4 seconds)
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    const pollDatabase = async () => {
      const dbRides = await supabaseSync.get("rides");
      if (dbRides) {
        setRides(dbRides);
      }

      const dbRequests = await supabaseSync.get("requests");
      if (dbRequests) {
        // Merge: trust server as source of truth but preserve items not yet synced
        setRequests(prev => {
          const merged = [...dbRequests];
          prev.forEach((localReq: RideRequest) => {
            if (!merged.some((r: RideRequest) => r.id === localReq.id)) {
              merged.push(localReq);
            }
          });
          return merged;
        });
      }

      const activeRides = dbRides || ridesRef.current;
      const myActiveRideIds = activeRides
        .filter((r: Ride) => r.hostId === currentUserIdRef.current || r.passengers.includes(currentUserIdRef.current))
        .map((r: Ride) => r.id);

      for (const rId of myActiveRideIds) {
        const dbMsgs = await supabaseSync.get(`messages_${rId}`);
        if (dbMsgs) {
          setMessages(prev => {
            const otherMsgs = prev.filter(m => m.rideId !== rId);
            return [...otherMsgs, ...dbMsgs].sort((a, b) => a.id.localeCompare(b.id));
          });
        }
      }

      // Garbage collect local messages for completed/cancelled rides
      const finishedRideIds = activeRides
        .filter((r: Ride) => r.status === "Completed" || r.status === "Cancelled")
        .map((r: Ride) => r.id);

      if (finishedRideIds.length > 0) {
        setMessages(prev => {
          const filtered = prev.filter(m => !finishedRideIds.includes(m.rideId));
          if (filtered.length !== prev.length) {
            return filtered;
          }
          return prev;
        });
      }
    };

    const interval = setInterval(pollDatabase, 2000);
    return () => clearInterval(interval);
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

  const addNotification = (notif: Notification) => {
    setNotifications(prev => [notif, ...prev]);
    playNotificationSound();
  };

  // Create Ride
  const createRide = (rideData: Omit<Ride, "id" | "hostId" | "hostName" | "hostAvatar" | "hostDept" | "hostRating" | "status" | "passengers"> & { womenOnly?: boolean }) => {
    const newRide: Ride = {
      ...rideData,
      id: `r-${Date.now()}`,
      hostId: currentUser.id,
      hostName: currentUser.name,
      hostAvatar: currentUser.avatar,
      hostDept: currentUser.department,
      hostRating: 4.8,
      status: "Published",
      passengers: []
    };

    setRides(prev => {
      const updated = [newRide, ...prev];
      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_rides", JSON.stringify(updated));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("rides", updated);
      }
      return updated;
    });
    
    // User earns credit for creating a ride
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== currentUser.id) return emp;
      return {
        ...emp,
        credits: emp.credits + 15,
        esgScore: Math.min(100, emp.esgScore + 2)
      };
    }));

    addNotification({
      id: `n-create-${Date.now()}`,
      title: "Ride Hosted Successfully 🚗",
      message: `Your ride from ${newRide.pickup} is published. 15 ESG credits added!`,
      timestamp: "Just now",
      type: "success",
      read: false
    });
  };

  // Request to Join a Ride
  const requestJoinRide = (rideId: string, pickup: string) => {
    const targetRide = rides.find(r => r.id === rideId);
    if (!targetRide) return;

    const newRequest: RideRequest = {
      id: `req-${Date.now()}`,
      rideId,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      requesterAvatar: currentUser.avatar,
      requesterDept: currentUser.department,
      requesterRating: 4.9,
      pickup,
      status: "Pending",
      timestamp: "Just now"
    };

    setRequests(prev => {
      const updated = [newRequest, ...prev];
      if (typeof window !== "undefined") {
        localStorage.setItem("ecoride_requests", JSON.stringify(updated));
      }
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSync.set("requests", updated);
      }
      return updated;
    });
  };

  // Respond to join request (Accept / Reject)
  const handleRequestResponse = (requestId: string, accept: boolean) => {
    const reqToRespond = requests.find(r => r.id === requestId);
    if (!reqToRespond) return;

    const targetRide = rides.find(r => r.id === reqToRespond.rideId);
    if (!targetRide) return;

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

    // 1. Update requests status
    let updatedRequests = requests.map(req => {
      if (req.id === requestId) {
        return { ...req, status: accept ? ("Accepted" as const) : ("Rejected" as const) };
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
    if (typeof window !== "undefined") {
      localStorage.setItem("ecoride_requests", JSON.stringify(updatedRequests));
    }
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseSync.set("requests", updatedRequests);
    }

    setRides(updatedRides);
    if (typeof window !== "undefined") {
      localStorage.setItem("ecoride_rides", JSON.stringify(updatedRides));
    }
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseSync.set("rides", updatedRides);
    }
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
      return updated;
    });
  };

  // Complete Ride
  const completeRide = (rideId: string, ratings: { safety: number; comfort: number; punctuality: number }) => {
    setRides(prev => {
      const updated = prev.map(ride => {
        if (ride.id !== rideId) return ride;

        const totalPassengers = ride.passengers.length;
        const co2Offset = ride.co2Saved * (totalPassengers || 1);
        const earnedCredits = ride.esgCredits + (totalPassengers * 15);

        // Award credits to the driver & passengers in the employees array
        setEmployees(prevEmps => prevEmps.map(emp => {
          const isDriver = emp.id === ride.hostId;
          const isPassenger = ride.passengers.includes(emp.id);

          if (isDriver) {
            const newCarbon = Number((emp.carbonSaved + co2Offset).toFixed(1));
            const newCredits = emp.credits + earnedCredits;
            
            // Badge achievements
            const updatedBadges = [...emp.badgeIds];
            if (newCarbon >= 100 && !updatedBadges.includes("3")) {
              updatedBadges.push("3"); // Carbon Warrior
            }

            return {
              ...emp,
              carbonSaved: newCarbon,
              credits: newCredits,
              badgeIds: updatedBadges,
              esgScore: Math.min(100, emp.esgScore + 5)
            };
          } else if (isPassenger) {
            const newCarbon = Number((emp.carbonSaved + (ride.co2Saved)).toFixed(1));
            const newCredits = emp.credits + Math.round(earnedCredits * 0.5); // Passenger gets 50% credits share

            return {
              ...emp,
              carbonSaved: newCarbon,
              credits: newCredits,
              esgScore: Math.min(100, emp.esgScore + 3)
            };
          }
          return emp;
        }));

        addNotification({
          id: `n-comp-${Date.now()}`,
          title: "Ride Commute Completed! 🎉",
          message: `Ride to ${ride.destination} completed. Carbon savings logged to ESG registries.`,
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

  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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

    addNotification({
      id: `n-adm-deac-${Date.now()}`,
      title: "User Account Suspended 🚫",
      message: `Employee ID ${employeeId} has been set to Inactive status.`,
      timestamp: "Just now",
      type: "warning",
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
        updateRideLocation
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
