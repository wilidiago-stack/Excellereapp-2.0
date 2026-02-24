'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import {
  Settings,
  LifeBuoy,
  Menu,
  Bell,
  Search,
  ChevronRight,
  Sparkles,
  Mic,
  MicOff
} from 'lucide-react';
import { useAuth } from '@/firebase';
import { APP_MODULES } from '@/lib/modules';
import { Input } from '@/components/ui/input';
import { ACTION_REGISTRY, type AppAction } from '@/lib/registry';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function MainHeader() {
  const { role, assignedModules } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AppAction[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const isAdmin = role === 'admin';

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Voice recognition is not supported in this browser.',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsSearchOpen(true);
    };

    recognition.onerror = (event: any) => {
      // Avoid console.error to prevent Next.js dev error overlay
      if (event.error !== 'aborted') {
        console.warn('Speech recognition warning:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const results = ACTION_REGISTRY.filter(action => {
      const hasPermission = isAdmin || assignedModules?.includes(action.moduleId) || 
        ['weather', 'calendar', 'map', 'safety-events', 'reports-analytics'].includes(action.moduleId);
      
      if (!hasPermission) return false;

      const searchContent = `${action.label} ${action.moduleName} ${action.description} ${action.moduleId}`.toLowerCase();
      return searchContent.includes(searchQuery.toLowerCase());
    }).slice(0, 6);

    setSearchResults(results);
  }, [searchQuery, isAdmin, assignedModules]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActionClick = (href: string) => {
    router.push(href);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const menuItems = APP_MODULES.map(module => {
    const isAssigned = assignedModules && assignedModules.includes(module.id);
    const show = isAdmin || isAssigned;
    return { ...module, show };
  });

  const secondaryMenuItems = [
    { href: '/settings', label: 'Settings', icon: Settings, disabled: false },
    { href: '#', label: 'Support', icon: LifeBuoy, disabled: true },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-[80vh] overflow-y-auto">
            {menuItems.map((item) =>
              item.show ? (
                <DropdownMenuItem key={item.label} asChild>
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              ) : null
            )}
            <DropdownMenuSeparator />
            {secondaryMenuItems.map((item) => (
              <DropdownMenuItem
                key={item.label}
                asChild
                disabled={item.disabled}
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/" className="flex items-center gap-2">
          <div className="flex flex-row items-baseline">
            <span className="text-[30px] font-semibold font-brand">
              <span className="text-[#46a395]">Excellere</span>
              <span className="text-[#FF9800]">App</span>
            </span>
            <span className="text-[8px] text-black ml-1">2.0</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 flex justify-center px-4 max-w-xl mx-auto relative" ref={searchRef}>
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search modules and actions..."
            className="w-full pl-9 pr-10 h-9 bg-slate-100/50 border-none rounded-full focus-visible:ring-1 focus-visible:ring-[#46a395]"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
          />
          <button 
            type="button"
            onClick={startListening}
            className={cn(
              "absolute right-3 top-2 transition-colors",
              isListening ? "text-red-500 animate-pulse" : "text-slate-400 hover:text-[#46a395]"
            )}
          >
            {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
          </button>
        </div>

        {isSearchOpen && searchQuery.trim().length >= 2 && (
          <div className="absolute top-11 left-4 right-4 bg-white rounded-sm border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="p-2 bg-slate-50 border-b flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-slate-400 px-2 tracking-widest">Global Action Results</span>
              <Sparkles className="h-3 w-3 text-[#46a395]" />
            </div>
            <div className="max-h-80 overflow-y-auto no-scrollbar">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-slate-400 italic">No matches found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="p-1">
                  {searchResults.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action.href)}
                      className="w-full flex items-center gap-3 p-3 rounded-sm hover:bg-slate-50 transition-colors group text-left"
                    >
                      <div className="h-9 w-9 rounded-sm bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-100">
                        <action.icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">{action.label}</span>
                          <span className="text-[9px] font-black uppercase text-slate-300 group-hover:text-[#46a395] transition-colors">{action.moduleName}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{action.description}</p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-slate-200 group-hover:text-slate-400 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-2 border-t bg-slate-50/50 flex items-center justify-center">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Enter query to refine search results</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <UserNav />
      </div>
    </header>
  );
}
