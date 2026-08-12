"use client";

import { useEffect, useState } from "react";
import type { ApiResponse, HealthStatus, TenantSummary } from "@restaurantos/shared";
import apiBaseUrl from "@/lib/api";

type FormState = {
  name: string;
  slug: string;
};

export default function HomePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [form, setForm] = useState<FormState>({ name: "", slug: "" });
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function loadDashboard() {
    const [healthResponse, tenantsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/health`),
      fetch(`${apiBaseUrl}/api/v1/tenants`),
    ]);

    if (!healthResponse.ok || !tenantsResponse.ok) {
      throw new Error("Failed to load dashboard data");
    }

    const healthJson = (await healthResponse.json()) as ApiResponse<HealthStatus>;
    const tenantsJson = (await tenantsResponse.json()) as ApiResponse<TenantSummary[]>;

    setHealth(healthJson.data);
    setTenants(tenantsJson.data);
  }

  useEffect(() => {
    loadDashboard().catch((loadError: unknown) => {
      const text = loadError instanceof Error ? loadError.message : "Unknown error";
      setError(text);
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as ApiResponse<TenantSummary> & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to create tenant");
      }

      setForm({ name: "", slug: "" });
      setMessage(payload.message ?? "Tenant created");
      await loadDashboard();
    } catch (submitError: unknown) {
      const text =
        submitError instanceof Error ? submitError.message : "Failed to create tenant";
      setError(text);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <h1>RestaurantOS AI</h1>
        <p>Development environment dashboard for the multi-tenant restaurant platform.</p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>API Status</h2>
          <p className={`status ${health?.status === "ok" ? "ok" : "degraded"}`}>
            {health?.status ?? "loading"}
          </p>
        </article>
        <article className="card">
          <h2>PostgreSQL</h2>
          <p className={`status ${health?.services.database === "up" ? "ok" : "down"}`}>
            {health?.services.database ?? "loading"}
          </p>
        </article>
        <article className="card">
          <h2>Redis</h2>
          <p className={`status ${health?.services.redis === "up" ? "ok" : "down"}`}>
            {health?.services.redis ?? "loading"}
          </p>
        </article>
      </section>

      <section className="card">
        <h2>Tenants</h2>
        <ul className="tenant-list">
          {tenants.map((tenant) => (
            <li key={tenant.id}>
              <span>
                <strong>{tenant.name}</strong>
                <div>{tenant.slug}</div>
              </span>
              <span>{tenant.userCount} users</span>
            </li>
          ))}
          {tenants.length === 0 ? <li>No tenants yet</li> : null}
        </ul>

        <form onSubmit={handleSubmit}>
          <input
            placeholder="Restaurant name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <input
            placeholder="slug"
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create tenant"}
          </button>
        </form>

        {message ? <p className="message">{message}</p> : null}
        {error ? <p className="message error">{error}</p> : null}
      </section>
    </main>
  );
}
