"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    data: Uint8Array;
    className?: string;
}

// ─── Custom Scrollbar ────────────────────────────────────────────────────────
// Renders a thin, branded track + draggable thumb that mirrors the scroll
// position of the given containerRef. The native scrollbar on the container
// must be hidden (scrollbar-hide class).
function CustomScrollbar({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);

    // Scrollbar geometry state
    const [thumbTop, setThumbTop] = useState(0);
    const [thumbHeight, setThumbHeight] = useState(0);
    const [visible, setVisible] = useState(false);

    // Auto-hide timer
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showScrollbar = () => {
        setVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setVisible(false), 1500);
    };

    // Recalculate thumb geometry whenever the container scrolls or resizes
    const recalc = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollHeight <= clientHeight) {
            setThumbHeight(0);
            return;
        }
        const ratio = clientHeight / scrollHeight;
        const tH = Math.max(32, clientHeight * ratio);
        const tTop = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - tH);
        setThumbHeight(tH);
        setThumbTop(tTop);
    }, [containerRef]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onScroll = () => { recalc(); showScrollbar(); };
        el.addEventListener("scroll", onScroll, { passive: true });

        const ro = new ResizeObserver(recalc);
        ro.observe(el);
        // Also watch children growing (pages loading in)
        const mo = new MutationObserver(recalc);
        mo.observe(el, { childList: true, subtree: true });

        recalc();

        return () => {
            el.removeEventListener("scroll", onScroll);
            ro.disconnect();
            mo.disconnect();
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, [containerRef, recalc]);

    // ── Drag to scroll ──────────────────────────────────────────────────────
    const dragStart = useRef<{ y: number; scrollTop: number } | null>(null);

    const onThumbPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;
        dragStart.current = { y: e.clientY, scrollTop: el.scrollTop };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        showScrollbar();
    };

    const onThumbPointerMove = (e: React.PointerEvent) => {
        if (!dragStart.current) return;
        const el = containerRef.current;
        const track = trackRef.current;
        if (!el || !track) return;

        const { scrollHeight, clientHeight } = el;
        const trackH = track.clientHeight;
        const thumbH = thumbRef.current?.clientHeight ?? 32;

        const delta = e.clientY - dragStart.current.y;
        const scrollRatio = (scrollHeight - clientHeight) / (trackH - thumbH);
        el.scrollTop = dragStart.current.scrollTop + delta * scrollRatio;
        showScrollbar();
    };

    const onThumbPointerUp = () => {
        dragStart.current = null;
    };

    // Click on track (not thumb) → jump to that position
    const onTrackClick = (e: React.MouseEvent) => {
        if (thumbRef.current && thumbRef.current.contains(e.target as Node)) return;
        const el = containerRef.current;
        const track = trackRef.current;
        if (!el || !track) return;

        const trackRect = track.getBoundingClientRect();
        const clickRatio = (e.clientY - trackRect.top) / trackRect.height;
        el.scrollTop = clickRatio * (el.scrollHeight - el.clientHeight);
        showScrollbar();
    };

    if (thumbHeight === 0) return null;

    return (
        <div
            ref={trackRef}
            onClick={onTrackClick}
            // w-8 logic gives a massive 32px touch target area for fingers on mobile!
            // touch-none prevents the mobile browser from intercepting the drag gesture. 
            className="absolute right-0 sm:right-1 top-1.5 bottom-1.5 w-8 sm:w-5 z-20 cursor-pointer flex justify-center touch-none"
            style={{
                transition: "opacity 300ms ease",
                opacity: visible ? 1 : 0,
            }}
        >
            {/* The thin, visible background track */}
            <div className="absolute inset-y-0 w-[4px] sm:w-[6px] bg-white/5 rounded-full pointer-events-none" />

            {/* The physical dragged thumb */}
            <div
                ref={thumbRef}
                onPointerDown={onThumbPointerDown}
                onPointerMove={onThumbPointerMove}
                onPointerUp={onThumbPointerUp}
                onPointerCancel={onThumbPointerUp}
                className="absolute w-[6px] cursor-grab active:cursor-grabbing touch-none"
                style={{
                    top: thumbTop,
                    height: thumbHeight,
                    background: "linear-gradient(180deg, hsl(195 81% 60%), hsl(195 81% 45%))",
                    borderRadius: "999px",
                    transition: "background 150ms ease",
                    boxShadow: "0 0 6px hsla(195,81%,60%,0.5)",
                }}
            />
        </div>
    );

}
// ─────────────────────────────────────────────────────────────────────────────

export function PDFViewer({ data, className }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageIndicator, setPageIndicator] = useState<string>("1");

    const [scale, setScale] = useState<number>(1.0);
    const [rotation, setRotation] = useState<number>(0);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    // Single ref for the scroll container — shared with CustomScrollbar
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const containerRef = useCallback((node: HTMLDivElement | null) => {
        scrollRef.current = node;
        if (node) {
            const ro = new ResizeObserver((entries) => {
                setContainerWidth(entries[0].contentRect.width);
            });
            ro.observe(node);
            setContainerWidth(node.clientWidth);
        }
    }, []);

    // ── Page indicator (scroll-driven, no flickering) ──────────────────────
    // Uses getBoundingClientRect for exact pixel ratios on every scroll event.
    // - topPage   = lowest page still >= 75% visible (stable during transitions)
    // - fullyVisible = pages >= 98% visible (shown as a range when multiple)
    const rafRef = useRef<number | null>(null);

    const updatePageIndicator = useCallback(() => {
        const container = scrollRef.current;
        if (!container || numPages === 0) return;

        const cRect = container.getBoundingClientRect();
        const cTop = cRect.top;
        const cBot = cRect.bottom;

        const pageEls = container.querySelectorAll<HTMLElement>("[data-pdf-page]");
        if (pageEls.length === 0) return;

        let topPage = 1;
        let topPageFound = false;
        let bestRatio = -1;
        let bestPage = 1;
        const fullyVisible: number[] = [];

        for (const el of pageEls) {
            const pg = Number(el.dataset.pdfPage);
            const rect = el.getBoundingClientRect();
            if (rect.height === 0) continue;

            const visTop = Math.max(rect.top, cTop);
            const visBot = Math.min(rect.bottom, cBot);
            const visH = Math.max(0, visBot - visTop);
            const ratio = visH / rect.height;

            // Track overall most-visible page as fallback
            if (ratio > bestRatio) { bestRatio = ratio; bestPage = pg; }

            // Top page: first (lowest number) page still >= 75% visible
            if (!topPageFound && ratio >= 0.75) { topPage = pg; topPageFound = true; }

            // Fully visible: >= 50% visible in viewport
            if (ratio >= 0.50) fullyVisible.push(pg);

        }

        if (!topPageFound) topPage = bestPage;

        let indicator: string;
        if (fullyVisible.length >= 2 && fullyVisible[0] !== fullyVisible[fullyVisible.length - 1]) {
            indicator = `${fullyVisible[0]}\u2013${fullyVisible[fullyVisible.length - 1]}`;
        } else {
            indicator = String(topPage);
        }

        setPageIndicator(indicator);
    }, [numPages]);

    // Attach scroll listener + re-run on resize/content change
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const schedule = () => {
            if (rafRef.current) return;
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                updatePageIndicator();
            });
        };

        container.addEventListener("scroll", schedule, { passive: true });
        const ro = new ResizeObserver(schedule);
        ro.observe(container);
        const mo = new MutationObserver(schedule);
        mo.observe(container, { childList: true, subtree: true });

        // Backup intersection observer to guarantee indicator updates even if smooth scrolling stalls
        const pageEls = container.querySelectorAll<HTMLElement>("[data-pdf-page]");
        const io = new IntersectionObserver(schedule, { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] });
        pageEls.forEach((el) => io.observe(el));

        schedule();

        return () => {
            container.removeEventListener("scroll", schedule);
            ro.disconnect();
            mo.disconnect();
            io.disconnect();
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        };
    }, [numPages, scale, rotation, updatePageIndicator]);


    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setIsLoading(false);
    }

    function onDocumentLoadError(error: Error) {
        console.error("PDF load error:", error);
        setIsLoading(false);
    }

    const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)));
    const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));
    const rotate = () => setRotation((r) => (r + 90) % 360);

    // Blob URL
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    useEffect(() => {
        const url = URL.createObjectURL(
            new Blob([data.buffer as ArrayBuffer], { type: "application/pdf" })
        );
        setBlobUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [data]);

    // Base width calculation for rendering
    const pageWidth = containerWidth > 0 ? (containerWidth - 32) * scale : undefined;

    if (!blobUrl) return null;

    return (
        <div className={cn("flex flex-col h-full bg-[#0d0d0d]", className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-center sm:justify-between px-2 sm:px-4 py-2 bg-card border-b border-border shrink-0">
                <span className="hidden sm:block text-xs font-bold text-primary uppercase tracking-widest">Preview</span>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} title="Zoom out">
                        <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-10 text-center tabular-nums select-none">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} title="Zoom in">
                        <ZoomIn className="w-3.5 h-3.5" />
                    </Button>

                    <div className="w-px h-4 bg-border mx-1" />

                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rotate} title="Rotate 90°">
                        <RotateCw className="w-3.5 h-3.5" />
                    </Button>

                    <div className="w-px h-4 bg-border mx-1" />

                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap select-none px-1">
                        {numPages ? `${pageIndicator} / ${numPages}` : "—"}
                    </span>
                </div>

                <div className="hidden sm:flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-muted" />
                    <div className="w-2 h-2 rounded-full bg-muted" />
                    <div className="w-2 h-2 rounded-full bg-muted" />
                </div>
            </div>

            {/* Scrollable PDF area + custom scrollbar */}
            <div className="flex-1 relative overflow-hidden">
                {/* Native scroll container — scrollbar hidden */}
                <div
                    ref={containerRef}
                    className="absolute inset-0 overflow-y-auto overflow-x-auto scrollbar-hide"
                    style={{ background: "#0d0d0d" }}
                >
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm">Rendering preview…</p>
                            </div>
                        </div>
                    )}

                    <Document
                        file={blobUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading=""
                        className="flex flex-col items-center gap-3 py-6 px-4"
                    >
                        {containerWidth > 0 && Array.from({ length: numPages }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                                <div
                                    key={`pw_${pageNum}`}
                                    data-pdf-page={pageNum}
                                    className="w-full flex justify-center"
                                >
                                    <Page
                                        pageNumber={pageNum}
                                        width={pageWidth}
                                        rotate={rotation}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                        canvasBackground="#0d0d0d"
                                        loading={
                                            <div
                                                className="flex items-center justify-center rounded-sm"
                                                style={{
                                                    background: '#0d0d0d',
                                                    width: pageWidth,
                                                    height: pageWidth ? pageWidth * 1.41 : 400
                                                }}
                                            >
                                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
                                            </div>
                                        }
                                        className="shadow-2xl rounded-sm overflow-hidden"
                                    />
                                </div>
                            );
                        })}
                    </Document>
                </div>

                {/* Custom scrollbar — rendered as a sibling overlay so it stays above content */}
                <CustomScrollbar containerRef={scrollRef} />
            </div>
        </div>
    );
}
