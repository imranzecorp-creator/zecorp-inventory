import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any) {
  const d = getDateObject(date);
  if (!d) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatTime(date: any) {
  const d = getDateObject(date);
  if (!d) return 'N/A';

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: any) {
  const d = getDateObject(date);
  if (!d) return 'N/A';

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateForInput(date: any) {
  const d = getDateObject(date);
  if (!d) return '';
  try {
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

export function getDateObject(date: any): Date | null {
  if (!date) return null;
  
  let d: Date;
  if (typeof date.toDate === 'function') {
    d = date.toDate();
  } else if (typeof date === 'number') {
    // Basic heuristic: if it's less than 10^11, it's likely seconds
    d = new Date(date < 10000000000 ? date * 1000 : date);
  } else {
    d = new Date(date);
  }

  return isNaN(d.getTime()) ? null : d;
}

export function safeJsonParse(text: string | null | undefined, fallback: any = []): any {
  if (!text) return fallback;
  
  try {
    // 1. First attempt: Direct parse after cleaning common markdown markers
    const cleaned = text.trim()
      .replace(/^```json\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
      
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // 2. Second attempt: Extract JSON block using regex (greedy)
      const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (match) {
        let candidate = match[0];
        
        try {
          return JSON.parse(candidate);
        } catch (innerE) {
          // 3. Third attempt: Handle trailing junk/extra brackets (common with some models)
          // Iteratively trim from the end until it parses or string is exhausted
          let tempCandidate = candidate;
          while (tempCandidate.length > 2) {
            tempCandidate = tempCandidate.slice(0, -1).trim();
            // Only try parsing if it ends with a valid JSON closure
            if (tempCandidate.endsWith(']') || tempCandidate.endsWith('}')) {
              try {
                return JSON.parse(tempCandidate);
              } catch (ignore) {}
            }
          }
        }
      }
      throw e; // Re-throw to be caught by the outer block
    }
  } catch (err) {
    console.error("AI JSON Parse Error:", err, "Raw Text:", text);
    return fallback;
  }
}
