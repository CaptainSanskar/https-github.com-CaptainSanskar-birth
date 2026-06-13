import { Birthday } from '../types';

// Helper to parse YYYY-MM-DD string into a local Date object at 00:00:00
export const parseLocalYMD = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const calculateDaysUntil = (birthDateString: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const birth = parseLocalYMD(birthDateString);
  const currentYear = today.getFullYear();
  
  // Create date for this year's birthday using local components
  let nextBirthday = new Date(currentYear, birth.getMonth(), birth.getDate());
  
  // Handle leap year case (Feb 29)
  if (birth.getMonth() === 1 && birth.getDate() === 29) {
     const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
     if (!isLeap(currentYear)) {
         // Conventionally celebrate on Feb 28 for non-leap years
         nextBirthday.setDate(28);
     }
  }

  // If birthday passed today (strict comparison), move to next year
  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1);
  }
  
  const diffTime = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const calculateAge = (birthDateString: string): number => {
  const today = new Date();
  const birth = parseLocalYMD(birthDateString);
  
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const calculateNextAge = (birthDateString: string): number => {
    return calculateAge(birthDateString) + 1;
}

export const sortBirthdays = (birthdays: Birthday[]): Birthday[] => {
  return [...birthdays].sort((a, b) => {
    const daysA = calculateDaysUntil(a.birthDate);
    const daysB = calculateDaysUntil(b.birthDate);
    return daysA - daysB;
  });
};

export const isToday = (birthDateString: string): boolean => {
    return calculateDaysUntil(birthDateString) === 0;
}

export const formatDateFriendly = (dateString: string): string => {
    const date = parseLocalYMD(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}