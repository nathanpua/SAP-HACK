import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  src?: string;
  brand?: string;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ src = "/logo.svg", brand = "SAP Hack", className }) => {
  return (
    <Image
      src={src}
      alt={`${brand} logo`}
      width={120}
      height={40}
      className={cn("block", className)}
    />
  );
};

export default Logo;
