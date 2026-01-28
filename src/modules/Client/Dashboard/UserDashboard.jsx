// src/modules/User/pages/UserDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api"; // axios instance with baseURL

export default function UserDashboard({ meId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // New public endpoint: active listings
        const { data } = await api.get("/listings", {
          params: { status: "active", limit: 24 },
        });

        const raw = Array.isArray(data?.items) ? data.items : [];

        // Normalize docs and filter out my own listings
        const cleaned = raw
          .map((it) => ({
            id: it.id || it._id, // mongo id
            ownerId: it.ownerId || it.owner || it.owner_id,
            status: it.status,
            photos: it.photos || it.photosMeta || [],
            coverIndex: it.coverIndex ?? 0,
            currency: it.currency || "PHP",
            priceSeatDay: it.priceSeatDay,
            priceRoomDay: it.priceRoomDay,
            priceWholeDay: it.priceWholeDay,
            priceSeatHour: it.priceSeatHour,
            priceRoomHour: it.priceRoomHour,
            priceWholeMonth: it.priceWholeMonth,
            venue: it.venue,
            category: it.category,
            scope: it.scope,
            city: it.city,
            region: it.region,
            country: it.country,
          }))
          .filter(
            (it) =>
              String(it.ownerId) !== String(meId) &&
              it.status === "active"
          );

        if (alive) setItems(cleaned);
      } catch (e) {
        console.error("Failed to load listings:", e);
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [meId]);

  const cards = useMemo(() => items.map(toCard), [items]);
  const popular = cards.slice(0, 8);
  const weekend = cards.slice(8, 16);

  return (
    <div className="pb-6">
      <Row
        title="Popular spaces near you"
        cards={popular}
        loading={loading}
        seeMoreHref="/app/spaces?section=popular"
      />
      <Row
        title="Available this weekend"
        cards={weekend}
        loading={loading}
        seeMoreHref="/app/spaces?section=weekend"
      />
    </div>
  );
}

/* ---------- Presentational bits ---------- */

function Row({ title, cards = [], loading, seeMoreHref }) {
  const showSeeMore = !loading && cards.length > 0 && seeMoreHref;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {showSeeMore && (
          <Link
            to={seeMoreHref}
            className="text-sm font-medium text-brand hover:text-brand/80"
          >
            See more
          </Link>
        )}
      </div>

      {/* Grid instead of horizontal scroll */}
      <div className="mt-4">
        {loading && cards.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && cards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {cards.map((c) => (
              <Card key={c.id} c={c} />
            ))}
          </div>
        )}

        {!loading && cards.length === 0 && (
          <div className="py-10 text-sm text-slate">No spaces found.</div>
        )}
      </div>
    </section>
  );
}

function Card({ c }) {
  return (
    <Link
      to={`/app/spaces/${c.id}`}
      className="w-full rounded-2xl border border-charcoal/15 bg-white shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-ink/30"
      title={c.title}
    >
      <img
        src={c.img}
        alt={c.title}
        className="h-44 w-full object-cover rounded-t-2xl"
      />
      <div className="p-3">
        <div className="font-medium text-ink truncate">{c.title}</div>
        <div className="text-sm text-slate truncate">{c.city}</div>
        <div className="mt-1 text-sm text-ink">
          {c.currencySymbol}
          {c.price.toLocaleString()}
          <span className="text-slate"> {c.priceNote}</span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="h-[230px] w-full rounded-2xl bg-slate-100 animate-pulse" />
  );
}

/* ---------- Helpers ---------- */

function toCard(it) {
  // Extract photo URL with fallback logic
  const coverIdx = Number.isInteger(it.coverIndex) ? it.coverIndex : 0;
  const photos = Array.isArray(it.photos) ? it.photos : [];
  
  let photoUrl = null;
  
  // Try to get photo at coverIndex
  let pick = photos[coverIdx] || photos[0];
  
  if (pick) {
    // If pick is a string, use it directly
    if (typeof pick === "string") {
      photoUrl = pick;
    } else {
      // Try to extract URL from object
      photoUrl = pick?.url || pick?.path || pick?.src || null;
    }
  }
  
  // If coverIndex photo has no URL, find first photo with URL
  if (!photoUrl && photos.length > 0) {
    pick = photos.find(p => {
      if (typeof p === "string") return true;
      return p?.url || p?.path || p?.src;
    });
    
    if (pick) {
      photoUrl = typeof pick === "string" 
        ? pick 
        : pick?.url || pick?.path || pick?.src || null;
    }
  }
  
  // Fallback to placeholder
  if (!photoUrl) {
    photoUrl = "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop";
  }

  const currency = (it.currency || "PHP").toUpperCase();
  const currencySymbol =
    currency === "PHP" ? "₱" : currency === "USD" ? "$" : `${currency} `;

  const price =
    firstNum([
      it.priceSeatDay,
      it.priceRoomDay,
      it.priceWholeDay,
      it.priceSeatHour,
      it.priceRoomHour,
      it.priceWholeMonth,
    ]) ?? 0;

  const unit =
    it.priceSeatHour || it.priceRoomHour
      ? "/ hour"
      : it.priceWholeMonth
      ? "/ month"
      : "/ day";

  const title =
    it.venue ||
    [cap(it.category), cap(it.scope)].filter(Boolean).join(" • ") ||
    "Space";

  return {
    id: it.id,
    title,
    city: [it.city, it.region, it.country].filter(Boolean).join(", "),
    img: photoUrl,
    price,
    priceNote: unit,
    currencySymbol,
  };
}

function firstNum(list) {
  for (const v of list) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
function cap(s) {
  return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "";
}
