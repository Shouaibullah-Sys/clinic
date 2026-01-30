"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Stethoscope,
  Clock,
  Shield,
  Users,
  Building,
  ArrowRight,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  Award,
  Sparkles,
  Ambulance,
  Microscope,
  Brain,
  Bone,
  Eye,
  Baby,
  Pill,
  ClipboardCheck,
  UserPlus,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  // Refs for GSAP animations
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);
  const ctaRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to appropriate dashboard based on role
      switch (user.role) {
        case "admin":
          router.push("/admin/dashboard");
          break;
        case "doctor":
          router.push("/doctor/dashboard");
          break;
        case "nurse":
          router.push("/nurse/dashboard");
          break;
        case "receptionist":
          router.push("/reception/dashboard");
          break;
        case "pharmacist":
          router.push("/pharmacy/dashboard");
          break;
        case "lab_technician":
          router.push("/laboratory/dashboard");
          break;
        case "radiologist":
          router.push("/radiology/dashboard");
          break;
        case "admission":
          router.push("/admissions/dashboard");
          break;
        case "staff":
          router.push("/staff/dashboard");
          break;
        default:
          router.push("/dashboard");
      }
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    // Hero section animations
    const tl = gsap.timeline();

    tl.fromTo(
      titleRef.current,
      { y: 100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power3.out" },
    )
      .fromTo(
        subtitleRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
        "-=0.5",
      )
      .fromTo(
        buttonRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" },
        "-=0.3",
      );

    // Features section animations
    gsap.fromTo(
      ".feature-card",
      { y: 100, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.2,
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      },
    );

    // Stats counter animation
    gsap.fromTo(
      ".stat-number",
      { textContent: 0 },
      {
        textContent: (
          i: any,
          target: { getAttribute: (arg0: string) => any },
        ) => {
          const endValue = parseInt(target.getAttribute("data-end") || "0");
          return endValue;
        },
        duration: 2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: statsRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
        onUpdate: function () {
          const targets = this.targets();
          if (targets.length === 0 || !targets[0]) return;
          const value = Math.floor(targets[0].textContent || 0);
          targets[0].textContent = value.toLocaleString();
        },
      },
    );

    // CTA section animation
    gsap.fromTo(
      ctaRef.current,
      { y: 100, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        scrollTrigger: {
          trigger: ctaRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      },
    );
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  const handleBookAppointment = () => {
    router.push("/appointments");
  };

  const handleEmergency = () => {
    router.push("/emergency");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const handleRegister = () => {
    router.push("/register");
  };

  const features = [
    {
      icon: <Stethoscope className="h-8 w-8" />,
      title: "Expert Medical Specialists",
      description:
        "Board-certified physicians and specialists providing comprehensive healthcare services across all major disciplines.",
      color: "text-blue-600",
    },
    {
      icon: <Microscope className="h-8 w-8" />,
      title: "Advanced Diagnostics",
      description:
        "State-of-the-art imaging, laboratory, and diagnostic facilities for accurate and timely medical assessments.",
      color: "text-green-600",
    },
    {
      icon: <Ambulance className="h-8 w-8" />,
      title: "24/7 Emergency Care",
      description:
        "Round-the-clock emergency services with rapid response teams and fully equipped emergency department.",
      color: "text-red-600",
    },
    {
      icon: <ClipboardCheck className="h-8 w-8" />,
      title: "Electronic Medical Records",
      description:
        "Secure digital record-keeping system accessible to authorized healthcare professionals for coordinated care.",
      color: "text-purple-600",
    },
    {
      icon: <Pill className="h-8 w-8" />,
      title: "Integrated Pharmacy",
      description:
        "In-house pharmacy with automated dispensing systems and real-time medication tracking.",
      color: "text-cyan-600",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Multi-disciplinary Teams",
      description:
        "Collaborative care approach with specialists, nurses, and support staff working together.",
      color: "text-orange-600",
    },
  ];

  const departments = [
    { name: "Cardiology", icon: <Heart className="h-6 w-6" /> },
    { name: "Orthopedics", icon: <Bone className="h-6 w-6" /> },
    { name: "Neurology", icon: <Brain className="h-6 w-6" /> },
    { name: "Ophthalmology", icon: <Eye className="h-6 w-6" /> },
    { name: "Pediatrics", icon: <Baby className="h-6 w-6" /> },
    { name: "Emergency", icon: <Ambulance className="h-6 w-6" /> },
    { name: "Oncology", icon: <Microscope className="h-6 w-6" /> },
    { name: "General Surgery", icon: <Stethoscope className="h-6 w-6" /> },
  ];

  const stats = [
    {
      number: 150,
      label: "Expert Doctors",
      icon: <Stethoscope className="h-6 w-6" />,
    },
    {
      number: 500,
      label: "Hospital Beds",
      icon: <Building className="h-6 w-6" />,
    },
    {
      number: 50,
      label: "Specialties",
      icon: <Award className="h-6 w-6" />,
    },
    {
      number: 24,
      label: "Emergency Services",
      icon: <Clock className="h-6 w-6" />,
    },
  ];

  const hospitalRoles = [
    {
      role: "admin",
      title: "Hospital Administrator",
      description:
        "Complete system access for managing hospital operations, staff, and financial reports.",
      icon: <Settings className="h-8 w-8" />,
      features: [
        "User Management",
        "Financial Reports",
        "System Configuration",
        "Staff Management",
      ],
      color: "bg-gradient-to-r from-purple-600 to-pink-600",
    },
    {
      role: "doctor",
      title: "Medical Doctor",
      description:
        "Comprehensive patient care tools including electronic medical records and prescriptions.",
      icon: <Stethoscope className="h-8 w-8" />,
      features: [
        "Patient Records",
        "Prescriptions",
        "Appointments",
        "Lab Results",
      ],
      color: "bg-gradient-to-r from-blue-600 to-cyan-600",
    },
    {
      role: "nurse",
      title: "Nursing Staff",
      description:
        "Patient monitoring, medication administration, and vital signs tracking.",
      icon: <Heart className="h-8 w-8" />,
      features: ["Vital Signs", "Medications", "Patient Care", "Admissions"],
      color: "bg-gradient-to-r from-green-600 to-emerald-600",
    },
    {
      role: "receptionist",
      title: "Reception/Registration",
      description:
        "Patient registration, appointment scheduling, and billing management.",
      icon: <UserPlus className="h-8 w-8" />,
      features: ["Appointments", "Registration", "Billing", "Patient Check-in"],
      color: "bg-gradient-to-r from-orange-600 to-yellow-600",
    },
    {
      role: "pharmacist",
      title: "Pharmacy Management",
      description:
        "Medication dispensing, inventory management, and prescription verification.",
      icon: <Pill className="h-8 w-8" />,
      features: [
        "Prescriptions",
        "Inventory",
        "Dispensing",
        "Stock Management",
      ],
      color: "bg-gradient-to-r from-teal-600 to-blue-600",
    },
    {
      role: "lab_technician",
      title: "Laboratory Technician",
      description:
        "Lab test management, results entry, and sample tracking system.",
      icon: <Microscope className="h-8 w-8" />,
      features: ["Lab Tests", "Results Entry", "Sample Tracking", "Reports"],
      color: "bg-gradient-to-r from-indigo-600 to-purple-600",
    },
  ];

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Sajad Barekzai Hospital
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleLogin}
                className="dark:text-gray-300"
              >
                Login
              </Button>
              <Button
                onClick={handleRegister}
                className="bg-linear-to-r from-blue-600 to-cyan-600"
              >
                Register
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200 dark:bg-green-900 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-8">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Excellence in Healthcare Since 2005
                </div>
              </div>

              <h1
                ref={titleRef}
                className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
              >
                Advanced Healthcare at{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-600">
                  Sajad Barekzai Hospital
                </span>
              </h1>

              <p
                ref={subtitleRef}
                className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed"
              >
                A premier healthcare institution providing comprehensive medical
                services with compassion, cutting-edge technology, and expert
                medical professionals dedicated to your well-being.
              </p>

              <div
                ref={buttonRef}
                className="flex flex-col sm:flex-row gap-4 mb-12"
              >
                <Button
                  size="lg"
                  className="px-8 py-3 text-lg bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  onClick={handleBookAppointment}
                >
                  Book Appointment
                  <Calendar className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-3 text-lg dark:border-gray-600 dark:text-gray-300"
                  onClick={handleEmergency}
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Emergency: 102
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-semibold dark:text-white">
                      24/7 Service
                    </span>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-semibold dark:text-white">
                      ISO Certified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Hospital Illustration Placeholder */}
              <div className="bg-linear-to-br from-blue-500 to-cyan-600 rounded-2xl p-8 text-white">
                <div className="aspect-square rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Building className="h-32 w-32" />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">150+</div>
                    <div className="text-sm opacity-90">Expert Doctors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">500+</div>
                    <div className="text-sm opacity-90">Hospital Beds</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center items-center mb-4">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  <span className="stat-number" data-end={stat.number}>
                    0
                  </span>
                  {stat.number <= 100 && "+"}
                </div>
                <div className="text-gray-600 dark:text-gray-300 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        ref={featuresRef}
        className="py-20 bg-linear-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Comprehensive Medical Services
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              We offer a wide range of specialized healthcare services delivered
              by expert medical professionals using advanced technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="feature-card border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 dark:bg-gray-800"
              >
                <CardHeader>
                  <div
                    className={`p-3 rounded-full w-fit ${feature.color.replace(
                      "text",
                      "bg",
                    )} bg-opacity-10`}
                  >
                    <div className={feature.color}>{feature.icon}</div>
                  </div>
                  <CardTitle className="text-xl dark:text-white">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Hospital Management System Roles */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Integrated Hospital Management System
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Role-based access control for different healthcare professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitalRoles.map((role, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 dark:bg-gray-800"
              >
                <CardHeader>
                  <div className={`${role.color} rounded-lg p-4 w-fit mb-4`}>
                    <div className="text-white">{role.icon}</div>
                  </div>
                  <CardTitle className="text-xl dark:text-white">
                    {role.title}
                  </CardTitle>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {role.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {role.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        <span className="dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full mt-6"
                    variant="outline"
                    onClick={handleRegister}
                  >
                    Register as {role.title.split(" ")[0]}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Medical Departments
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Specialized care across various medical disciplines
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {departments.map((dept, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300 border border-gray-200 dark:border-gray-700"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 mb-4">
                  {dept.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {dept.name}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency CTA Section */}
      <section className="py-20 bg-gradient-to-r from-red-600 to-pink-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                24/7 Emergency Services
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Our emergency department is fully equipped and staffed round the
                clock to handle any medical emergency with immediate care.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle2 className="h-6 w-6 text-green-300 mr-3" />
                  <span className="text-lg">Rapid Response Team</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="h-6 w-6 text-green-300 mr-3" />
                  <span className="text-lg">Advanced Life Support</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="h-6 w-6 text-green-300 mr-3" />
                  <span className="text-lg">
                    Immediate Specialist Consultation
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <div className="text-center">
                <Ambulance className="h-20 w-20 mx-auto mb-6" />
                <div className="text-6xl font-bold mb-4">102</div>
                <p className="text-xl font-semibold mb-6">Emergency Hotline</p>
                <Button
                  size="lg"
                  className="w-full bg-white text-red-600 hover:bg-gray-100"
                  onClick={handleEmergency}
                >
                  Call Emergency
                  <Phone className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Login/Register CTA */}
      <section
        ref={ctaRef}
        className="py-20 bg-gradient-to-br from-blue-600 to-cyan-700 text-white"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Join Our Healthcare Team
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Access the hospital management system with your assigned role and
            contribute to providing excellent patient care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="px-8 py-3 text-lg bg-white text-blue-600 hover:bg-gray-100"
              onClick={handleLogin}
            >
              Login to System
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              className="px-8 py-3 text-lg bg-transparent border-2 border-white hover:bg-white/10"
              onClick={handleRegister}
            >
              Register Account
              <UserPlus className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="mt-4 text-sm opacity-75">
            Access requires valid hospital credentials or administrator approval
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Heart className="h-6 w-6 text-blue-400 mr-2" />
                <h3 className="text-xl font-bold">Sajad Barekzai Hospital</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Providing exceptional healthcare services with compassion and
                excellence.
              </p>
              <div className="flex items-center text-gray-400">
                <MapPin className="h-5 w-5 mr-2" />
                <span>Kabul, Afghanistan</span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="cursor-pointer hover:text-white">
                  Find a Doctor
                </li>
                <li className="cursor-pointer hover:text-white">Departments</li>
                <li className="cursor-pointer hover:text-white">
                  Health Checkups
                </li>
                <li
                  className="cursor-pointer hover:text-white"
                  onClick={handleBookAppointment}
                >
                  Book Appointment
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Emergency Care</li>
                <li>OPD Services</li>
                <li>Diagnostics</li>
                <li>Surgery</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact Info</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  <span>+93 78 123 4567</span>
                </li>
                <li>Emergency: 102</li>
                <li>info@sajadhospital.af</li>
                <li>Mon-Sun: 24/7</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>
              © {new Date().getFullYear()} Sajad Barekzai Hospital. All rights
              reserved.
            </p>
            <p className="mt-2 text-sm">Hospital Management System v2.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
