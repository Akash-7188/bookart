"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  BadgeIndianRupee,
  BookOpen,
  CheckCircle2,
  Crosshair,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  MapPin,
  ScanLine,
  Sparkles,
  Store,
  Timer,
} from "lucide-react";
import { Badge, Button, Card, Checkbox, FieldError, FieldHint, Input, Label, RadioTile, Select, Textarea } from "@/components/ui";
import { Stepper } from "@/components/ui/misc";
import { createListingAction } from "@/app/actions/marketplace";
import { CATEGORIES, CONDITIONS, FORMATS, ITEM_KINDS } from "@/lib/constants";
import { DEFECT_PRESETS, SUBJECT_SUGGESTIONS, WIZARD_STEPS, listingFormSchema, type ListingFormValues } from "@/lib/listing-schema";
import { coverDataUri } from "@/lib/covers";
import { buildRentalTiers, inr } from "@/lib/rental";
import { useLocationStore } from "@/store/location-store";
import type { Category, Condition, Format, ItemKind, SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ListingWizard({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const location = useLocationStore();
  const [step, setStep] = React.useState(0);
  const [submitState, setSubmitState] = React.useState<{ ok?: boolean; error?: string; listingId?: string }>({});
  const [busy, setBusy] = React.useState(false);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    mode: "onTouched",
    defaultValues: {
      kind: "book",
      category: "competitive_exams",
      format: "paperback",
      title: "",
      author: "",
      publisher: "",
      edition: "",
      year: "",
      isbn: "",
      language: "English",
      pages: "",
      subject: "",
      course: "",
      condition: "gently_used",
      conditionNotes: [],
      purchasedOn: "",
      mrp: "",
      buyPrice: "",
      isRentable: false,
      rentalBaseRate: "",
      depositMultiplier: "1",
      latitude: location.latitude,
      longitude: location.longitude,
      pickupArea: "",
      pickupCity: location.city,
      pickupPincode: location.pincode,
      tags: [],
    },
  });

  const values = form.watch();
  const isNotes = values.kind === "notes" || values.kind === "bundle";

  // Keep GPS-derived fields in sync with the location store.
  React.useEffect(() => {
    form.setValue("latitude", location.latitude);
    form.setValue("longitude", location.longitude);
    if (!form.getValues("pickupCity")) form.setValue("pickupCity", location.city);
    if (!form.getValues("pickupPincode")) form.setValue("pickupPincode", location.pincode);
  }, [location.latitude, location.longitude, location.city, location.pincode, form]);

  const baseRate = Number(values.rentalBaseRate || 0);
  const tierPreview = baseRate > 0 ? buildRentalTiers(baseRate) : [];
  const mrp = Number(values.mrp || 0);
  const price = Number(values.buyPrice || 0);
  const discount = mrp && price ? Math.round((1 - price / mrp) * 100) : 0;

  async function next() {
    const fields = WIZARD_STEPS[step].fields as unknown as (keyof ListingFormValues)[];
    const valid = await form.trigger(fields as never);
    if (!valid) return;
    setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1));
  }

  async function submit(data: ListingFormValues) {
    setBusy(true);
    setSubmitState({});
    const payload = {
      ...data,
      year: data.year ? Number(data.year) : undefined,
      pages: data.pages ? Number(data.pages) : undefined,
      mrp: Number(data.mrp),
      buyPrice: data.buyPrice ? Number(data.buyPrice) : null,
      rentalBaseRate: data.rentalBaseRate ? Number(data.rentalBaseRate) : null,
      depositMultiplier: Number(data.depositMultiplier || 1),
    };
    const res = await createListingAction(payload);
    setBusy(false);
    if (res.ok) {
      setSubmitState({ ok: true, listingId: res.listingId });
      router.refresh();
    } else {
      setSubmitState({ ok: false, error: res.error });
    }
  }

  if (!user) {
    return (
      <Card className="p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Store className="h-6 w-6" />
        </span>
        <h2 className="mt-3 font-serif text-2xl font-bold text-ink-900">Sign in to list your item</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
          Listing is free for individuals. Registered bookstores and libraries can verify with a GSTIN / registration ID
          and unlock bulk listing, a rental ledger and a verified badge.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/login?next=/sell">
            <Button>Sign in</Button>
          </Link>
          <Link href="/signup?next=/sell">
            <Button variant="outline">Create an account</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (submitState.ok) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="font-serif text-2xl font-bold text-ink-900">Your listing is live</h2>
          <p className="max-w-md text-sm text-ink-600">
            Buyers within {location.radiusKm > 0 ? `${location.radiusKm} km` : "courier range"} of {values.pickupArea},{" "}
            {values.pickupCity} can now find “{values.title}”.
            {values.isRentable ? " Rental tiers were generated from your daily rate." : ""}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {submitState.listingId ? (
              <Link href={`/product/${submitState.listingId}`}>
                <Button>View listing</Button>
              </Link>
            ) : null}
            <Link href="/seller">
              <Button variant="outline">Seller dashboard</Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                form.reset();
                setSubmitState({});
                setStep(0);
              }}
            >
              List another item
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const previewProduct = {
    id: "preview",
    title: values.title || "Your title appears here",
    author: values.author || "Author / faculty",
    category: values.category as Category,
    coverStyle: (values.title?.length ?? 3) % 8,
    condition: values.condition as Condition,
    conditionNotes: values.conditionNotes,
    publisher: values.publisher,
    isbn: values.isbn,
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-4 sm:p-5">
        <Stepper steps={WIZARD_STEPS.map((s) => s.label)} current={step} />

        <form
          className="mt-5 space-y-4"
          onSubmit={form.handleSubmit(submit, () => setStep((s) => Math.max(0, s)))}
        >
          {step === 0 ? (
            <section className="space-y-4">
              <div>
                <Label>What are you listing?</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {ITEM_KINDS.map((item) => (
                    <RadioTile
                      key={item.value}
                      checked={values.kind === item.value}
                      onChange={() => form.setValue("kind", item.value as ItemKind, { shouldValidate: true })}
                      title={item.label}
                      subtitle={
                        item.value === "book"
                          ? "Single title"
                          : item.value === "notes"
                            ? "Handwritten / Xerox"
                            : "Multi-book combo"
                      }
                      icon={<BookOpen className="h-4 w-4 text-brand-600" />}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label>Category</Label>
                <div className="grid gap-2">
                  {CATEGORIES.map((cat) => (
                    <RadioTile
                      key={cat.slug}
                      checked={values.category === cat.slug}
                      onChange={() => form.setValue("category", cat.slug as Category, { shouldValidate: true })}
                      title={`${cat.emoji} ${cat.label}`}
                      subtitle={cat.blurb}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="format">Format</Label>
                <Select id="format" {...form.register("format")}>
                  {FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </Select>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="e.g. Concepts of Physics — Volume 1" {...form.register("title")} />
                <FieldError>{form.formState.errors.title?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="author">{isNotes ? "Faculty / author *" : "Author *"}</Label>
                <Input id="author" placeholder="e.g. H. C. Verma" {...form.register("author")} />
                <FieldError>{form.formState.errors.author?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="publisher">Publisher</Label>
                <Input id="publisher" placeholder="e.g. Bharati Bhawan" {...form.register("publisher")} />
              </div>
              <div>
                <Label htmlFor="edition">Edition</Label>
                <Input id="edition" placeholder="e.g. 5th Edition" {...form.register("edition")} />
              </div>
              <div>
                <Label htmlFor="year">Year (print)</Label>
                <Input id="year" inputMode="numeric" placeholder="2021" {...form.register("year")} />
                <FieldError>{form.formState.errors.year?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="isbn">ISBN</Label>
                <Input id="isbn" placeholder="978-81-7709-187-8" {...form.register("isbn")} />
                <FieldHint>
                  <ScanLine className="mr-1 inline h-3 w-3" /> Buyers can scan the barcode or paste the ISBN.
                </FieldHint>
              </div>
              <div>
                <Label htmlFor="language">Language *</Label>
                <Input id="language" {...form.register("language")} />
                <FieldError>{form.formState.errors.language?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="pages">Number of pages</Label>
                <Input id="pages" inputMode="numeric" placeholder="462" {...form.register("pages")} />
                <FieldError>{form.formState.errors.pages?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input id="subject" list="subject-suggestions" placeholder="Physics / Polity / DBMS" {...form.register("subject")} />
                <datalist id="subject-suggestions">
                  {SUBJECT_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {isNotes ? <FieldHint>Required for notes and study bundles — it powers course-wise search.</FieldHint> : null}
              </div>
              <div>
                <Label htmlFor="course">{isNotes ? "Course / semester" : "Course (optional)"}</Label>
                <Input id="course" placeholder="B.Tech Sem 3 · B.Com Sem 2 · UPSC CSE" {...form.register("course")} />
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              <div>
                <Label>Condition grade *</Label>
                <div className="grid gap-2">
                  {CONDITIONS.map((condition) => (
                    <RadioTile
                      key={condition.value}
                      checked={values.condition === condition.value}
                      onChange={() => form.setValue("condition", condition.value as Condition, { shouldValidate: true })}
                      title={condition.label}
                      subtitle={condition.help}
                    />
                  ))}
                </div>
              </div>

              {values.condition !== "brand_new" ? (
                <div>
                  <Label htmlFor="purchasedOn">When did you buy it?</Label>
                  <Input id="purchasedOn" type="month" max="2026-12" {...form.register("purchasedOn")} />
                  <FieldHint>Month & year is enough. Older copies reassure buyers about page quality.</FieldHint>
                </div>
              ) : null}

              <div>
                <Label>Highlight defects (buyers see these on the listing)</Label>
                <div className="grid gap-0.5 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                  {DEFECT_PRESETS.map((defect) => (
                    <Checkbox
                      key={defect}
                      checked={values.conditionNotes.includes(defect)}
                      onChange={(checked) =>
                        form.setValue(
                          "conditionNotes",
                          checked
                            ? [...values.conditionNotes, defect]
                            : values.conditionNotes.filter((d) => d !== defect),
                          { shouldDirty: true },
                        )
                      }
                      label={defect}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <Label htmlFor="customDefect">Anything else?</Label>
                  <div className="flex gap-2">
                    <Input id="customDefect" placeholder="e.g. Library stamp on page 3" onKeyDown={addCustomDefect} />
                  </div>
                  <FieldHint>Press Enter to add. Honest disclosure reduces returns and damage disputes.</FieldHint>
                </div>
                {values.conditionNotes.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {values.conditionNotes.map((note) => (
                      <Badge key={note} tone="amber">
                        {note}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="mrp">MRP / printed price (₹) *</Label>
                  <Input id="mrp" inputMode="numeric" placeholder="525" {...form.register("mrp")} />
                  <FieldError>{form.formState.errors.mrp?.message}</FieldError>
                </div>
                <div>
                  <Label htmlFor="buyPrice">Your selling price (₹)</Label>
                  <Input id="buyPrice" inputMode="numeric" placeholder="355" {...form.register("buyPrice")} />
                  <FieldError>{form.formState.errors.buyPrice?.message}</FieldError>
                  <FieldHint>
                    {discount > 0 ? (
                      <>
                        <Sparkles className="mr-1 inline h-3 w-3 text-emerald-600" />
                        {discount}% below MRP — buyers see the strike-through automatically.
                      </>
                    ) : (
                      "Leave blank if you only want to rent this item out."
                    )}
                  </FieldHint>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <Checkbox
                  checked={values.isRentable}
                  onChange={(checked) => form.setValue("isRentable", checked, { shouldValidate: true })}
                  label={
                    <span className="font-semibold text-ink-900">
                      Enable renting (deposit model)
                      <span className="ml-1 font-normal text-ink-500">— renters pay the item value as deposit</span>
                    </span>
                  }
                />
                {values.isRentable ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="rentalBaseRate">Rental price per day (₹) *</Label>
                      <Input id="rentalBaseRate" inputMode="numeric" placeholder="9" {...form.register("rentalBaseRate")} />
                      <FieldError>{form.formState.errors.rentalBaseRate?.message}</FieldError>
                      <FieldHint>
                        <Info className="mr-1 inline h-3 w-3" /> Suggested for your price: ₹
                        {Math.max(3, Math.round((price || mrp) / 90))}/day
                      </FieldHint>
                    </div>
                    <div>
                      <Label htmlFor="depositMultiplier">Deposit multiplier</Label>
                      <Select id="depositMultiplier" {...form.register("depositMultiplier")}>
                        <option value="1">1.0× (standard — item value)</option>
                        <option value="1.15">1.15× (rare / high value)</option>
                        <option value="1.5">1.5× (collector copy)</option>
                      </Select>
                    </div>
                  </div>
                ) : null}

                {tierPreview.length ? (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      <Timer className="h-3.5 w-3.5" /> Rental tiers Bookart will publish
                    </p>
                    <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                      {tierPreview.map((tier) => (
                        <li key={tier.days} className="flex items-center justify-between text-xs">
                          <span className="text-ink-600">{tier.label}</span>
                          <span className="font-bold text-ink-900">{inr(tier.fee)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-[11px] text-ink-500">
                      Deposit collected: {inr(Math.round((price || mrp) * Number(values.depositMultiplier || 1)))} ·
                      refunded to the renter after inspection, minus the tier fee.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    placeholder="upsc, polity, 2025 edition"
                    onChange={(e) =>
                      form.setValue(
                        "tags",
                        e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                      )
                    }
                  />
                </div>
                <div className="rounded-xl bg-brand-50 p-3 text-[11px] text-brand-900">
                  <p className="flex items-center gap-1.5 font-bold">
                    <BadgeIndianRupee className="h-3.5 w-3.5" /> Payouts
                  </p>
                  <p className="mt-1">
                    Sale proceeds: price − 5% commission, settled T+2 after handover. Rental fee: −12%. Deposit stays in
                    escrow until the buyer returns the copy.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-ink-900">
                  <MapPin className="h-3.5 w-3.5 text-brand-600" /> Pickup location powers the radius search
                </p>
                <p className="mt-1 text-[11px] text-ink-500">
                  Buyers within their chosen radius see your listing first. GPS coordinates are captured from your device;
                  you can also type a shop/home address.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={location.useCurrentLocation} loading={location.status === "locating"}>
                    <Crosshair className="h-3.5 w-3.5" /> Use current GPS
                  </Button>
                  <Badge tone={location.source === "gps" ? "emerald" : "slate"}>
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Badge>
                  {location.error ? <span className="text-[11px] text-amber-700">{location.error}</span> : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="pickupArea">Shop name / house & street *</Label>
                  <Input id="pickupArea" placeholder="Shree Ganesh Book Depot, Jawahar Marg" {...form.register("pickupArea")} />
                  <FieldError>{form.formState.errors.pickupArea?.message}</FieldError>
                </div>
                <div>
                  <Label htmlFor="pickupCity">City *</Label>
                  <Input id="pickupCity" placeholder="Pithampur" {...form.register("pickupCity")} />
                  <FieldError>{form.formState.errors.pickupCity?.message}</FieldError>
                </div>
                <div>
                  <Label htmlFor="pickupPincode">Pincode *</Label>
                  <Input id="pickupPincode" inputMode="numeric" placeholder="454775" {...form.register("pickupPincode")} />
                  <FieldError>{form.formState.errors.pickupPincode?.message}</FieldError>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Photo checklist before you publish</p>
                <ul className="mt-1.5 grid gap-1 text-xs text-ink-700 sm:grid-cols-2">
                  {["Front cover", "Back cover", "Spine", "Sample inner page", "Any damage close-up"].map((shot) => (
                    <li key={shot} className="flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-brand-600" /> {shot}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-ink-500">
                  This demo generates condition-accurate cover art from your details; production accepts 3–6 uploads per
                  listing.
                </p>
              </div>
            </section>
          ) : null}

          {submitState.error ? (
            <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
              {submitState.error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-ink-500 sm:block">
                Step {step + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[step].label}
              </span>
              {step < WIZARD_STEPS.length - 1 ? (
                <Button type="button" onClick={next}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" variant="cash" loading={busy}>
                  <Sparkles className="h-4 w-4" /> Publish listing
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* Live preview rail */}
      <div className="space-y-4 lg:sticky lg:top-36 lg:self-start">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
            <LayoutGrid className="h-3.5 w-3.5" /> Live buyer preview
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <Image
              src={coverDataUri(previewProduct, "front")}
              alt="cover preview"
              width={600}
              height={800}
              unoptimized
              className="h-40 w-full object-cover"
            />
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-bold text-ink-900">{previewProduct.title}</p>
              <p className="text-xs text-ink-500">{previewProduct.author}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-base font-extrabold text-ink-900">{price ? inr(price) : "—"}</span>
                {mrp > price && price ? (
                  <span className="text-xs text-ink-500 line-through">{inr(mrp)}</span>
                ) : null}
              </div>
              {values.isRentable && baseRate > 0 ? (
                <p className="mt-1 text-[11px] font-bold text-cash-600">
                  Rent {inr(tierPreview.find((t) => t.days === 30)?.fee ?? 0)} / 30 days
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge tone="brand">{values.condition.replace(/_/g, " ")}</Badge>
                {values.isRentable ? <Badge tone="cash">Buy & Rent</Badge> : <Badge tone="dark">Buy Only</Badge>}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Listing tips</p>
          <ul className="mt-2 space-y-2 text-xs text-ink-600">
            <li className="flex gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Photograph the sample page so buyers can see writing/highlighting before paying a deposit.
            </li>
            <li className="flex gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Notes sell 3× faster when the semester and subject are in the title.
            </li>
            <li className="flex gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Enabling rent unlocks semester-length rentals — most libraries set 6–9% of value per month.
            </li>
          </ul>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Signed in as</p>
          <p className="mt-1 text-sm font-bold text-ink-900">{user.name}</p>
          <p className="text-xs text-ink-500 capitalize">
            {user.sellerKind} seller · verification {user.verification.status}
          </p>
          {user.verification.status === "pending" ? (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
              Store/library verification is pending. Your listings go live now, the verified badge appears once an admin
              approves.
            </p>
          ) : null}
          <div className={cn("mt-2 rounded-lg p-2 text-[11px]", user.verifiedSeller ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-ink-600")}>
            {user.verifiedSeller ? "Verified seller — buyers see the trust badge." : "Individual seller — free listing."}
          </div>
        </Card>
      </div>
    </div>
  );

  function addCustomDefect(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const input = event.currentTarget;
    const value = input.value.trim();
    if (!value) return;
    form.setValue("conditionNotes", [...form.getValues("conditionNotes"), value], { shouldDirty: true });
    input.value = "";
  }
}
