import React from "react";

type ChecklistItemProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

const ChecklistItem: React.FC<ChecklistItemProps> = ({ label, children, className }) => {
  return (
    <div className={`flex items-start gap-3 ${className ?? ""}`}>
      <div className="w-6 h-6 rounded-full bg-dark-900 flex items-center justify-center mt-1 flex-shrink-0">
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="p-3 rounded-lg bg-gray-50/80 backdrop-blur-sm border border-gray-100">
          <span className="font-semibold text-lg sm:text-xl">{label}:</span>{" "}
          <span className="text-gray-800 text-sm sm:text-base">{children}</span>
        </div>
      </div>
    </div>
  );
};

export default ChecklistItem;
