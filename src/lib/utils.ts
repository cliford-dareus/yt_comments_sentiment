import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const generateCSV = async (data: string[]) => {
  // Create CSV header
  const header = 'Value\n';
  // Convert array of strings to CSV format
  const csvContent = header + data.join('\n');
  return csvContent;
};
