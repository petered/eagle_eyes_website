# adsb.lol Integration Notes

Documentation of the ADS-B layer integration on `/drone-map`, sourced from [adsb.lol](https://www.adsb.lol) via the `mirada-airspace` Cloudflare Worker proxy.

## What it is

Community-run ADS-B aggregator at `https://www.adsb.lol`. Founded as a community alternative after **ADS-B Exchange was acquired by JetNet in 2023** (which locked down the API). Maintained primarily by GitHub user `@iakat`. All infrastructure is open-source under [github.com/adsblol](https://github.com/adsblol):

- `adsblol/infra` — Kubernetes-based aggregation infrastructure (readsb, tar1090, mlat-server)
- `adsblol/api` — the live API at `api.adsb.lol`
- `adsblol/feed` — feeder container that volunteer contributors run
- `adsblol/website`, `globe_history_*`, etc.

## Legal posture (verified)

- **License: CC0 (Public Domain).** Volunteer feeders explicitly waive all copyright when they sign up to contribute, per the [Privacy & License page](https://www.adsb.lol/privacy-license/).
- **Commercial use:** Permitted without restriction under CC0.
- **Attribution:** Appreciated as courtesy but not legally required.
- **Source data:** Aircraft position broadcasts on 1090 MHz, captured from open RF spectrum by volunteer feeders with SDR receivers. Capturing 1090 MHz ADS-B is legal worldwide — every commercial aircraft is regulatorily required to broadcast unencrypted.

## What it is *not*

- **Not scraping** FlightAware, FlightRadar24, or other commercial trackers. Those have ToS prohibiting redistribution; doing so would be illegal. The adsb.lol infra README is explicit about the data flow being `feeder → ingest → hub → planes`, and the feeder client is open source.
- **Not laundered commercial data.** Feeders own their captures and license them CC0 at signup; the chain of redistribution rights is enforceable.
- **Not a scam.** Verified open-source infrastructure, public maintainer, standard ADS-B tooling stack. The `.lol` TLD is internet humor, not a red flag.

Same model as OpenStreetMap (mappers contribute under ODbL) and Wikipedia (volunteers contribute under CC-BY-SA): the license is enforceable because contributors explicitly grant it.

## Operational caveats

- **No SLA.** Community-run hobby project. If they go down, this layer disappears from the public drone-map until they're back. No contractual recourse.
- **Coverage is volunteer-feeder dependent.** Strong in US/EU urban areas; sparse in remote Canada, arctic, and over oceans — where SAR operations often happen.
- **For paid product reliability:** treat this layer as a *supplement*, not a replacement. Reliable paths for the paid tier are: (1) ADS-B receivers attached to Eagle Eyes Pilot deployments in the field (the current EDS-B path), or (2) FlightAware AeroAPI (commercial, SLA, paid).
- **Be a good citizen:** the proxy edge-caches responses for 5 seconds so bursts from multiple browser clients hitting the same bbox coalesce to one upstream fetch per window. If usage scales, consider running Eagle Eyes-hosted feeders as a contribution back.

## CORS limitation and why we proxy

`api.adsb.lol` does not return `Access-Control-Allow-Origin` headers. A browser at `eagleeyessearch.com` cannot fetch directly — the browser blocks the response even though the server returns 200.

To work around this, we route through the existing `mirada-airspace` Cloudflare Worker, which:

1. Validates the inbound path against allowed characters (`[A-Za-z0-9/_.\-]`) — defense against open-proxy abuse
2. Forwards to `api.adsb.lol` with `User-Agent: eagleeyes-airspace-worker/1.0 (proxy for eagleeyessearch.com; contact info@eagleeyessearch.com)` — identified consumer in their logs
3. Returns the response with `Access-Control-Allow-Origin` matching the existing airspace Origin allowlist
4. Edge-caches for 5 seconds (`Cache-Control: public, max-age=5, s-maxage=5`)
5. Inherits the Worker's 600 req/min/IP rate limit

## Endpoint we use

```
GET https://mirada-airspace.patrick-e20.workers.dev/proxy/adsb/v2/lat/{lat}/lon/{lon}/dist/{distNM}
```

Returns:
```json
{
  "ac": [ /* array of aircraft objects */ ],
  "msg": "...",
  "now": 1716000000000,
  "total": 6,
  "ctime": 1716000000000,
  "ptime": 12
}
```

Max radius: 250 NM (enforced by adsb.lol upstream).

## Aircraft object fields (commonly populated)

| Field | Description |
|---|---|
| `hex` | ICAO 24-bit hex code |
| `flight` | Callsign (right-padded to 8 chars) |
| `r` | Registration (e.g. "C-GIUK", "N839NN") |
| `t` | Aircraft type code (e.g. "B738", "P28A") |
| `lat`, `lon` | Position |
| `alt_baro` | Barometric altitude (ft) |
| `alt_geom` | Geometric altitude (ft) |
| `gs` | Ground speed (kt) |
| `track` | True track / heading (deg) |
| `squawk` | Squawk code |
| `category` | Wake turbulence category |
| `seen` | Seconds since last update from the receiver |
| `dst` | Distance from query point (NM) |
| `messages` | Total messages received from this aircraft |

## Disclaimer flow on the website

First-time toggle-on triggers the standard **Cancel / I understand / Don't show again** modal, matching the Canadian and FAA drone-layer disclaimer pattern. Modal content covers:

- What the data source is (community ADS-B aggregator)
- CC0 license + commercial-use note
- "Not for primary navigation; verify against authoritative sources" liability text
- Outbound link to https://www.adsb.lol/privacy-license/
- "Don't show again" toggle persists via localStorage key `ee_adsb_lol_disclaimer_suppressed`

If the user clicks Cancel, the layer toggle reverts to off.

## Refresh strategy on the website

- On layer toggle-on (after disclaimer ack): fetch immediately for the current viewport
- On Leaflet `moveend` (debounced ~500ms): refetch with the new bbox
- Background poll: every 10 seconds while the layer is active, refetch the current bbox (ADS-B data updates every ~5s upstream; 10s is a balance between freshness and Worker load)
- On layer toggle-off: stop all polling, clear markers

## Future considerations

- Move to a paid SLA source if needed for paid product tiers (FlightAware AeroAPI is the obvious commercial path)
- Run Eagle Eyes-hosted ADS-B feeders as a good-citizenship contribution back to adsb.lol
- Coverage dashboard to monitor adsb.lol availability and feeder density in SAR-critical regions
- Dedupe with EDS-B-sourced aircraft by ICAO hex (currently both layers can show the same aircraft as two markers if both toggles are on)

## Verification log

What I confirmed before integrating:

- ✅ Project ownership: `@iakat` is real and identifiable on GitHub. Infra is in `github.com/adsblol`, public.
- ✅ License: confirmed CC0 by fetching `adsb.lol/privacy-license/` — "waive all copyright and related or neighboring rights to the data you are sharing, under the CC0 license"
- ✅ Origin: confirmed by reading `adsblol/infra` README — "Due to recent events regarding ADSBExchange being acquired, it would be wise for the community to have a quick and easy way to deploy an alternative aggregation service"
- ✅ Live API: confirmed `GET https://api.adsb.lol/v2/lat/49.28/lon/-123.12/dist/50` returns JSON `{"ac": [...]}` with the field shape above
- ✅ CORS gap: confirmed via direct `curl` headers — no `Access-Control-Allow-Origin` on the upstream API, hence the proxy
- ✅ Proxy live: confirmed by airspace agent on 2026-05-18, deployment ID `f49e5465-a91a-47a9-8dd1-47f85be43d57`
