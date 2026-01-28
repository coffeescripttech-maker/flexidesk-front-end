import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfToday } from "date-fns";
import { Search, SlidersHorizontal } from "lucide-react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SearchBar() {
  const [where, setWhere] = useState("");
  const [date, setDate] = useState({ from: undefined, to: undefined });
  const [guests, setGuests] = useState(0);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [category, setCategory] = useState("");
  const [noiseLevel, setNoiseLevel] = useState("");
  const [idealFor, setIdealFor] = useState("");
  const [workStyle, setWorkStyle] = useState("");

  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();

    const params = new URLSearchParams();

    if (where.trim()) params.set("where", where.trim());

    if (date?.from && date?.to) {
      params.set("checkIn", format(date.from, "yyyy-MM-dd"));
      params.set("checkOut", format(date.to, "yyyy-MM-dd"));
    }

    if (guests > 0) params.set("guests", String(guests));
    
    if (minPrice && !isNaN(Number(minPrice))) {
      params.set("minPrice", minPrice);
    }
    
    if (maxPrice && !isNaN(Number(maxPrice))) {
      params.set("maxPrice", maxPrice);
    }
    
    if (category) params.set("category", category);
    
    if (noiseLevel) params.set("noiseLevel", noiseLevel);
    
    if (idealFor) params.set("idealFor", idealFor);
    
    if (workStyle) params.set("workStyle", workStyle);

    const query = params.toString();
    navigate(query ? `/app/workspaces?${query}` : "/app/workspaces");
  };

  const dateLabel =
    date?.from && date?.to
      ? `${format(date.from, "MMM d")} – ${format(date.to, "MMM d")}`
      : "Add dates";

  const guestsLabel =
    guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : "Add guests";
  
  const hasFilters = minPrice || maxPrice || category || noiseLevel || idealFor || workStyle;

  return (
    <form
      onSubmit={onSubmit}
      className="
        w-full max-w-5xl
        flex items-center
        rounded-full bg-white
        shadow-[0_4px_16px_rgba(0,0,0,0.08)]
        px-3 py-1
      "
    >
      <div className="flex-1 px-6 py-3 min-w-0">
        <div className="text-xs font-semibold text-ink">Where</div>
        <Input
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          placeholder="City, building, or workspace"
          className="
            mt-0.5 h-5 border-0 p-0
            text-sm text-ink/80
            bg-transparent shadow-none
            placeholder:text-ink/40
            focus-visible:ring-0 focus-visible:ring-offset-0
          "
        />
      </div>

      <div className="h-8 w-px bg-charcoal/10" />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="
              flex-1 px-6 py-3 h-auto
              rounded-none justify-start
              text-left hover:bg-transparent
            "
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-ink">When</span>
              <span className="text-sm text-ink/80">{dateLabel}</span>
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="p-3 shadow-lg bg-white rounded-xl border border-charcoal/10"
        >
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={date}
            onSelect={setDate}
            disabled={(d) => d < startOfToday()}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <div className="h-8 w-px bg-charcoal/10" />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="
              flex-1 px-6 py-3 h-auto
              rounded-none justify-start
              text-left hover:bg-transparent
            "
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-ink">Who</span>
              <span className="text-sm text-ink/80">{guestsLabel}</span>
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-56 p-4 bg-white rounded-xl shadow-lg border border-charcoal/10">
          <div className="flex items-center justify-between">
            <span className="text-sm">Guests</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setGuests((g) => Math.max(0, g - 1))}
              >
                –
              </Button>
              <span className="w-6 text-center text-sm font-medium">
                {guests}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setGuests((g) => g + 1)}
              >
                +
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-8 w-px bg-charcoal/10" />

      {/* More Filters */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="
              relative px-4 py-3 h-auto
              rounded-none justify-start
              text-left hover:bg-transparent
            "
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-ink/70" />
              <span className="text-sm text-ink/80">Filters</span>
              {hasFilters && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-brand" />
              )}
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-4 bg-white rounded-xl shadow-lg border border-charcoal/10">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-ink mb-1">Daily Price Range (₱)</h3>
              <p className="text-[10px] text-ink/50 mb-3">Filter by daily rates only</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="minPrice" className="text-xs text-ink/70">Min per day</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="maxPrice" className="text-xs text-ink/70">Max per day</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    placeholder="10000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="category" className="text-sm font-semibold text-ink">Workspace Type</Label>
              <Select value={category || "all"} onValueChange={(val) => setCategory(val === "all" ? "" : val)}>
                <SelectTrigger className="mt-2 h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="office">Office Space</SelectItem>
                  <SelectItem value="desk">Hot Desk</SelectItem>
                  <SelectItem value="meeting">Meeting Room</SelectItem>
                  <SelectItem value="private">Private Office</SelectItem>
                  <SelectItem value="coworking">Co-working Space</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-charcoal/10 pt-4">
              <h3 className="text-sm font-semibold text-ink mb-3">Work Environment</h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="noiseLevel" className="text-xs text-ink/70">Noise Level</Label>
                  <Select value={noiseLevel || "all"} onValueChange={(val) => setNoiseLevel(val === "all" ? "" : val)}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Any noise level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any noise level</SelectItem>
                      <SelectItem value="quiet">Quiet</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="lively">Lively</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="idealFor" className="text-xs text-ink/70">Ideal For</Label>
                  <Select value={idealFor || "all"} onValueChange={(val) => setIdealFor(val === "all" ? "" : val)}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Anyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Anyone</SelectItem>
                      <SelectItem value="freelancers">Freelancers</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="startups">Startups</SelectItem>
                      <SelectItem value="small-business">Small Business</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="remote-teams">Remote Teams</SelectItem>
                      <SelectItem value="creative">Creative Professionals</SelectItem>
                      <SelectItem value="tech">Tech Professionals</SelectItem>
                      <SelectItem value="consultants">Consultants</SelectItem>
                      <SelectItem value="educators">Educators</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="workStyle" className="text-xs text-ink/70">Work Style</Label>
                  <Select value={workStyle || "all"} onValueChange={(val) => setWorkStyle(val === "all" ? "" : val)}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Any style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any style</SelectItem>
                      <SelectItem value="focused">Focused/Quiet Work</SelectItem>
                      <SelectItem value="collaborative">Collaborative</SelectItem>
                      <SelectItem value="networking">Networking/Social</SelectItem>
                      <SelectItem value="flexible">Flexible/Hybrid</SelectItem>
                      <SelectItem value="creative">Creative/Brainstorming</SelectItem>
                      <SelectItem value="meetings">Client Meetings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  setCategory("");
                  setNoiseLevel("");
                  setIdealFor("");
                  setWorkStyle("");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="submit"
        className="
          ml-2 mr-1
          flex h-10 w-10 items-center justify-center
          rounded-full
          bg-brand
          text-ink
          shadow-[0_4px_12px_rgba(0,0,0,0.10)]
          hover:bg-brand/90
          transition
          flex-shrink-0
        "
        aria-label="Search"
      >
        <Search className="h-4 w-4 text-ink" />
      </button>
    </form>
  );
}
