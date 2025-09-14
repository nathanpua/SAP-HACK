"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  BarChart3,
  GraduationCap,
  Brain,
  Music,
  ArrowRight,
} from "lucide-react";

const agents = [
  {
    icon: Search,
    title: "SAP Research Agent",
    description: "Specializes in gathering SAP-specific career information, training resources, and industry trends for current SAP employees",
    functionalities: [
      "SAP career research & job market analysis",
      "SAP certification & training program research",
      "SAP industry trends & company intelligence",
      "SAP internal mobility & advancement opportunities"
    ],
    color: "from-blue-500 to-purple-600",
    bgColor: "from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30",
  },
  {
    icon: BarChart3,
    title: "SAP Analysis Agent",
    description: "Provides personalized career analysis using user profile data and SAP employee database insights",
    functionalities: [
      "SAP resume & skills gap assessment",
      "SAP career path & progression analysis",
      "SAP certification evaluation & recommendations",
      "Personalized career development planning"
    ],
    color: "from-green-500 to-teal-600",
    bgColor: "from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30",
  },
  {
    icon: GraduationCap,
    title: "SAP Skills Development Agent",
    description: "Focuses on SAP training resources, course recommendations, and structured learning pathways",
    functionalities: [
      "SAP technical skills development guidance",
      "Certification training & course recommendations",
      "SAP Learning Hub program navigation",
      "Hands-on practice & project opportunities"
    ],
    color: "from-purple-500 to-pink-600",
    bgColor: "from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30",
  },
  {
    icon: Brain,
    title: "SAP Synthesis Agent",
    description: "Integrates insights from all agents to deliver comprehensive SAP career strategy and action plans",
    functionalities: [
      "Comprehensive career strategy development",
      "Integration of research, analysis & skills insights",
      "SAP-specific career roadmap creation",
      "Measurable goals & success metrics"
    ],
    color: "from-orange-500 to-red-600",
    bgColor: "from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30",
  },
  {
    icon: Music,
    title: "SAP Career Coach Orchestra",
    description: "Orchestrates all specialized agents to provide holistic SAP career guidance through coordinated workflows",
    functionalities: [
      "Multi-agent coordination & task orchestration",
      "Interactive career guidance sessions",
      "Comprehensive SAP career strategy synthesis",
      "Real-time collaboration between specialized agents"
    ],
    color: "from-cyan-500 to-blue-600",
    bgColor: "from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30",
  },
];

const FeaturesShowcase = () => {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [count, setCount] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
  }, [api]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-16 sm:py-20 lg:py-24 relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden"
      id="features-showcase"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-3xl"></div>
      </div>

      <div className="container relative z-10 px-4 sm:px-6 lg:px-8 mx-auto">
        {/* Header */}
        <div className={`text-center mb-12 lg:mb-16 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            <span>🤖</span>
            <span>AI Agent Ecosystem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Meet Our Specialized AI Agents
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover our team of specialized AI agents, each designed to provide expert SAP career guidance through coordinated intelligence
          </p>
        </div>

        {/* Main Carousel */}
        <div className={`transition-all duration-1000 delay-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <Carousel
            className="w-full max-w-6xl mx-auto"
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {agents.map((agent, index) => {
                const Icon = agent.icon;

                return (
                  <CarouselItem key={index} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                    <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102">
                      <CardContent className="p-6 lg:p-8">
                        {/* Icon */}
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${agent.color} flex items-center justify-center mb-6 shadow-lg`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>

                        {/* Content */}
                        <h3 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                          {agent.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                          {agent.description}
                        </p>

                        {/* Functionalities */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Key Functionalities:</h4>
                          <ul className="space-y-1">
                            {agent.functionalities.slice(0, 2).map((func, funcIndex) => (
                              <li key={funcIndex} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${agent.color}`}></div>
                                {func}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* CTA */}
                        <button className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                          Learn more
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            <CarouselPrevious className="left-2 sm:left-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700" />
            <CarouselNext className="right-2 sm:right-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700" />
          </Carousel>
        </div>

        {/* Dots indicator */}
        <div className={`flex justify-center mt-8 transition-all duration-1000 delay-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className="w-3 h-3 rounded-full mx-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-300"
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-12 lg:mt-16 transition-all duration-1000 delay-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <button className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            Experience Our AI Agents
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Discover how our specialized AI agents work together to provide comprehensive SAP career guidance
          </p>
        </div>
      </div>
    </section>
  );
};

export default FeaturesShowcase;
