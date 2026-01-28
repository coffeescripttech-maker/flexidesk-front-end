// src/modules/Client/WorkspacesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { MapPin, Star, X } from "lucide-react";
import api from "@/services/api";

// Leaflet
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Vite/Webpack
const defaultIcon = L.icon({
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

function priceLabel(listing) {
  // Prioritize daily rates for display consistency
  const value =
    listing.priceText ??
    listing.priceLabel ??
    listing.priceSeatDay ??
    listing.priceWholeDay ??
    listing.priceRoomDay ??
    listing.priceSeatHour ??
    listing.priceWholeMonth;

  if (!value && value !== 0) return "See details for pricing";

  const num = Number(value);
  const formatted = Number.isFinite(num)
    ? num.toLocaleString("en-PH")
    : String(value);

  return `₱${formatted}`;
}

function getPriceDetails(listing) {
  // Return the most relevant price with its unit
  if (listing.priceSeatDay) {
    return { 
      amount: listing.priceSeatDay, 
      unit: 'per seat/day',
      isDaily: true 
    };
  }
  if (listing.priceWholeDay) {
    return { 
      amount: listing.priceWholeDay, 
      unit: 'per day',
      isDaily: true 
    };
  }
  if (listing.priceRoomDay) {
    return { 
      amount: listing.priceRoomDay, 
      unit: 'per room/day',
      isDaily: true 
    };
  }
  if (listing.priceSeatHour) {
    return { 
      amount: listing.priceSeatHour, 
      unit: 'per hour',
      isDaily: false 
    };
  }
  if (listing.priceWholeMonth) {
    return { 
      amount: listing.priceWholeMonth, 
      unit: 'per month',
      isDaily: false 
    };
  }
  return { 
    amount: null, 
    unit: '',
    isDaily: false 
  };
}

export default function WorkspacesPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  const query = useMemo(
    () => Object.fromEntries(params.entries()),
    [params]
  );

  const where = query.where || "";
  const guests = query.guests ? Number(query.guests) : 0;
  const checkIn = query.checkIn || "";
  const checkOut = query.checkOut || "";
  const minPrice = query.minPrice || "";
  const maxPrice = query.maxPrice || "";
  const category = query.category || "";
  const noiseLevel = query.noiseLevel || "";
  const idealFor = query.idealFor || "";
  const workStyle = query.workStyle || "";

  const hasActiveFilters = minPrice || maxPrice || category || noiseLevel || idealFor || workStyle;

  // Helper function to get filter label
  const getFilterLabel = (key, value) => {
    const labels = {
      minPrice: `Min: ₱${value}`,
      maxPrice: `Max: ₱${value}`,
      category: {
        office: 'Office Space',
        desk: 'Hot Desk',
        meeting: 'Meeting Room',
        private: 'Private Office',
        coworking: 'Co-working',
        cowork: 'Co-working'
      }[value] || value,
      noiseLevel: {
        quiet: 'Quiet',
        moderate: 'Moderate',
        lively: 'Lively'
      }[value] || value,
      idealFor: {
        freelancers: 'Freelancers',
        students: 'Students',
        startups: 'Startups',
        'small-business': 'Small Business',
        enterprise: 'Enterprise',
        'remote-teams': 'Remote Teams',
        creative: 'Creative',
        tech: 'Tech',
        consultants: 'Consultants',
        educators: 'Educators'
      }[value] || value,
      workStyle: {
        focused: 'Focused Work',
        collaborative: 'Collaborative',
        networking: 'Networking',
        flexible: 'Flexible',
        creative: 'Creative',
        meetings: 'Meetings'
      }[value] || value
    };
    return labels[key] || value;
  };

  // Function to remove a specific filter
  const removeFilter = (filterKey) => {
    const newParams = new URLSearchParams(params);
    newParams.delete(filterKey);
    navigate(`/app/workspaces?${newParams.toString()}`);
  };

  // Function to clear all filters
  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    // Keep only location and date params
    if (where) newParams.set('where', where);
    if (checkIn) newParams.set('checkIn', checkIn);
    if (checkOut) newParams.set('checkOut', checkOut);
    if (guests) newParams.set('guests', guests);
    navigate(`/app/workspaces?${newParams.toString()}`);
  };

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const filters = [];
    if (minPrice) filters.push({ key: 'minPrice', value: minPrice, label: getFilterLabel('minPrice', minPrice) });
    if (maxPrice) filters.push({ key: 'maxPrice', value: maxPrice, label: getFilterLabel('maxPrice', maxPrice) });
    if (category) filters.push({ key: 'category', value: category, label: getFilterLabel('category', category) });
    if (noiseLevel) filters.push({ key: 'noiseLevel', value: noiseLevel, label: getFilterLabel('noiseLevel', noiseLevel) });
    if (idealFor) filters.push({ key: 'idealFor', value: idealFor, label: getFilterLabel('idealFor', idealFor) });
    if (workStyle) filters.push({ key: 'workStyle', value: workStyle, label: getFilterLabel('workStyle', workStyle) });
    return filters;
  }, [minPrice, maxPrice, category, noiseLevel, idealFor, workStyle]);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        setUsingFallback(false);

        const res = await api.get("/listings/search", { params: query });
        let data = res.data?.items || [];

        // fallback: random public listings
        if (!data.length) {
          const allRes = await api.get("/listings", { params: { limit: 48 } });
          const all = allRes.data?.items || [];
          const shuffled = [...all].sort(() => Math.random() - 0.5);
          data = shuffled.slice(0, 24);
          setUsingFallback(true);
        }

        setItems(data);
      } catch (err) {
        console.error("Failed to load listings", err);
        setItems([]);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [query]);

  // build map points
  const mapPoints = useMemo(() => {
    return items
      .map((l) => {
        const lat = l.lat ?? l.latitude;
        const lng = l.lng ?? l.longitude;
        const latNum = lat != null ? Number(lat) : NaN;
        const lngNum = lng != null ? Number(lng) : NaN;
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
        return {
          id: l.id,
          lat: latNum,
          lng: lngNum,
          title: l.title,
          price: priceLabel(l),
          city: l.city,
        };
      })
      .filter(Boolean);
  }, [items]);

  const mapCenter = useMemo(() => {
    if (!mapPoints.length) return [14.5995, 120.9842]; // Manila
    const sum = mapPoints.reduce(
      (acc, p) => {
        acc.lat += p.lat;
        acc.lng += p.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    return [sum.lat / mapPoints.length, sum.lng / mapPoints.length];
  }, [mapPoints]);

  if (loading) {
    return (
      <div className="px-8 py-10 text-sm text-ink/60">
        Loading workspaces…
      </div>
    );
  }

  return (
    <div
      className="
        px-4 lg:px-8
        pt-6 lg:pt-8 pb-4
        lg:h-[calc(100vh-96px)]  /* adjust if your header height differs */
        lg:flex lg:flex-col
      "
    >
      {/* header (non-scroll, fixed at top of this section) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg lg:text-xl font-semibold text-ink">
            {where ? `Workspaces in ${where}` : "Explore workspaces"}
          </h1>
          <p className="text-xs lg:text-sm text-ink/60 mt-0.5">
            {checkIn && checkOut
              ? `${checkIn} – ${checkOut}${
                  guests ? ` · ${guests} guest${guests > 1 ? "s" : ""}` : ""
                }`
              : guests
              ? `${guests} guest${guests > 1 ? "s" : ""}`
              : "Choose dates and guests to see live availability."}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] lg:text-xs text-ink/60">
          {usingFallback && (
            <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 px-3 py-1 border border-amber-200 text-[11px]">
              Showing similar spaces (no exact matches)
            </span>
          )}
          <span>
            {items.length}{" "}
            {items.length === 1 ? "space available" : "spaces available"}
          </span>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-medium text-ink/60">Active filters:</span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => removeFilter(filter.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-xs font-medium hover:bg-brand/20 transition-colors"
            >
              <span>{filter.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-ink/5 text-ink/70 text-xs font-medium hover:bg-ink/10 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* main layout: left scroll, right fixed height */}
      <div
        className="
          flex-1
          flex flex-col lg:flex-row
          gap-6
          lg:overflow-hidden
        "
      >
        {/* LEFT: scrollable list */}
        <div
          className="
            flex-1 min-w-0
            lg:overflow-y-auto
            lg:pr-2
          "
        >
          {items.length === 0 ? (
            <div className="text-sm text-ink/60 py-10">
              No workspaces to show right now.
            </div>
          ) : (
            <div className="grid gap-4 md:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((listing) => {
                // Extract image from various possible sources
                let img = null;
                
                // Try cover field first
                if (listing.cover) {
                  img = listing.cover;
                }
                // Try photosMeta array (Cloudinary uploads)
                else if (Array.isArray(listing.photosMeta) && listing.photosMeta.length > 0) {
                  // Try coverIndex first
                  const coverIndex = listing.coverIndex || 0;
                  let photo = listing.photosMeta[coverIndex];
                  img = photo?.url || photo?.path || null;
                  
                  // If coverIndex photo has no URL, find first photo with URL
                  if (!img) {
                    photo = listing.photosMeta.find(p => p?.url || p?.path);
                    img = photo?.url || photo?.path || null;
                  }
                }
                // Try images array as fallback
                else if (Array.isArray(listing.images) && listing.images.length > 0) {
                  img = listing.images[0];
                }

                // Get category badge styling
                const getCategoryBadge = (category) => {
                  const badges = {
                    meeting: { label: 'Meeting Room', color: 'bg-blue-100 text-blue-700' },
                    office: { label: 'Office Space', color: 'bg-purple-100 text-purple-700' },
                    desk: { label: 'Hot Desk', color: 'bg-green-100 text-green-700' },
                    private: { label: 'Private Office', color: 'bg-amber-100 text-amber-700' },
                    coworking: { label: 'Co-working', color: 'bg-pink-100 text-pink-700' },
                    cowork: { label: 'Co-working', color: 'bg-pink-100 text-pink-700' },
                  };
                  return badges[category?.toLowerCase()] || { label: category || 'Workspace', color: 'bg-gray-100 text-gray-700' };
                };

                const categoryBadge = getCategoryBadge(listing.category);
                const priceDetails = getPriceDetails(listing);

                return (
                  <Link
                    key={listing.id}
                    to={`/app/spaces/${listing.id}`}
                    className="group rounded-3xl overflow-hidden border border-charcoal/10 bg-white shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {img ? (
                        <img
                          src={img}
                          alt={listing.title || "Workspace image"}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-ink/40">
                          Image coming soon
                        </div>
                      )}
                      
                      {/* Category Badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${categoryBadge.color} backdrop-blur-sm`}>
                          {categoryBadge.label}
                        </span>
                      </div>

                      {/* Rating Badge */}
                      {typeof listing.rating === "number" && (
                        <div className="absolute top-3 right-3">
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/95 backdrop-blur-sm shadow-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold text-ink">{listing.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col gap-2">
                      {/* Title */}
                      <div className="text-base font-semibold text-ink line-clamp-1 group-hover:text-brand transition-colors">
                        {listing.title || listing.venue || "Workspace"}
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 text-xs text-ink/60">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {listing.city || listing.venue || "Location"}
                          {listing.country && listing.country !== 'Philippines' ? ` · ${listing.country}` : ""}
                        </span>
                      </div>

                      {/* Description */}
                      {listing.shortDesc && (
                        <p className="text-xs text-ink/60 line-clamp-2 leading-relaxed">
                          {listing.shortDesc}
                        </p>
                      )}

                      {/* Amenities/Features */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {listing.seats > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-[10px] text-ink/70">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {listing.seats} seats
                          </span>
                        )}
                        {listing.amenities?.wifi && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-[10px] text-ink/70">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                            </svg>
                            WiFi
                          </span>
                        )}
                        {listing.amenities?.ac && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-[10px] text-ink/70">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                            AC
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mt-auto pt-3 border-t border-charcoal/5">
                        <div className="flex items-baseline justify-between">
                          <div className="flex flex-col">
                            {priceDetails.amount ? (
                              <>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-lg font-bold text-ink">
                                    ₱{priceDetails.amount.toLocaleString("en-PH")}
                                  </span>
                                  <span className="text-[11px] text-ink/50">
                                    {priceDetails.unit}
                                  </span>
                                </div>
                                {/* Show additional pricing options if available */}
                                {!priceDetails.isDaily && listing.priceSeatDay && (
                                  <span className="text-[10px] text-ink/40 mt-0.5">
                                    ₱{listing.priceSeatDay.toLocaleString("en-PH")} per day
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-ink/60">
                                See details for pricing
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-brand font-medium group-hover:underline">
                            View details →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: map with fixed height (fills container) */}
        <div className="hidden lg:block w-[380px] xl:w-[420px]">
          <div
            className="
              h-full
              rounded-3xl border border-charcoal/10
              overflow-hidden shadow-sm bg-slate-100
            "
          >
            {mapPoints.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="text-sm font-semibold text-ink">
                  No map data yet
                </div>
                <p className="text-xs text-ink/60">
                  We couldn&apos;t find coordinates for these spaces. Once hosts
                  add map locations, you&apos;ll see them here.
                </p>
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapPoints.map((p) => (
                  <Marker key={p.id} position={[p.lat, p.lng]}>
                    <Popup>
                      <div className="text-xs">
                        <div className="font-semibold mb-1">{p.title}</div>
                        <div className="text-ink/70 mb-1">{p.city}</div>
                        <div className="font-semibold">{p.price}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
