"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  ClipboardCheck,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { useInspections } from "@/hooks/use-inspections";
import { useSites } from "@/hooks/use-sites";
import { useActions } from "@/hooks/use-actions";
import { navItems } from "@/components/layout/sidebar";

/** Lazy-loaded data groups — only subscribes to Firestore while the palette is open */
function SearchPaletteData({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { inspections } = useInspections();
  const { sites } = useSites();
  const { actions } = useActions();

  return (
    <>
      <CommandSeparator />

      {inspections.length > 0 && (
        <CommandGroup heading="Inspections">
          {inspections.slice(0, 20).map((i) => (
            <CommandItem
              key={i.id}
              value={`inspection ${i.name} ${i.siteName} ${i.inspectorName}`}
              onSelect={() => onNavigate(`/inspections/${i.id}`)}
            >
              <ClipboardCheck className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="truncate">{i.name}</span>
              {i.siteName && (
                <span className="ml-2 text-xs text-muted-foreground truncate">
                  {i.siteName}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {sites.length > 0 && (
        <CommandGroup heading="Sites">
          {sites.slice(0, 15).map((s) => (
            <CommandItem
              key={s.id}
              value={`site ${s.name} ${s.address}`}
              onSelect={() => onNavigate(`/sites/${s.id}`)}
            >
              <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="truncate">{s.name}</span>
              {s.address && (
                <span className="ml-2 text-xs text-muted-foreground truncate">
                  {s.address}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {actions.length > 0 && (
        <CommandGroup heading="Actions">
          {actions.slice(0, 15).map((a) => (
            <CommandItem
              key={a.id}
              value={`action ${a.title} ${a.assignee}`}
              onSelect={() => onNavigate(`/inspections/${a.inspectionId}`)}
            >
              <AlertTriangle className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="truncate">{a.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </>
  );
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Cmd+K / Ctrl+K keyboard shortcut + custom event from header search button
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openPalette = () => setOpen(true);
    document.addEventListener("keydown", down);
    document.addEventListener("open-search-palette", openPalette);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-search-palette", openPalette);
    };
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search inspections, sites, actions, and pages"
    >
      <CommandInput placeholder="Search inspections, sites, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Pages */}
        <CommandGroup heading="Pages">
          {navItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`page ${item.label}`}
              onSelect={() => navigate(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Data groups — hooks only mount when palette is open */}
        {open && <SearchPaletteData onNavigate={navigate} />}
      </CommandList>
    </CommandDialog>
  );
}
