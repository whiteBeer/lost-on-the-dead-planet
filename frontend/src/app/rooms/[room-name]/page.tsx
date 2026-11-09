"use client";

import dynamic from "next/dynamic";

// Pixi тяжёлый — не грузим его на этапе `next build` / Collecting page data
const RoomClient = dynamic(() => import("./RoomClient"), { ssr: false });

export default function RoomPage() {
    return <RoomClient />;
}
