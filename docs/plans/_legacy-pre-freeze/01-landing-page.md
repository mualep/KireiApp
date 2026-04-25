# Implementation Plan: Main Landing Page (`/`)

## 1. Overview
The Main Landing Page serves as the public storefront for Kireiku. Built with Next.js 15 App Router, it utilizes a premium futuristic glassmorphism gaming aesthetic. this landing page is come with 2 mode in 3 options, which are dark mode, light mode, and by system. The primary objective is to convert visitors by showcasing services, building trust via statistics and testimonials, and directing them to the official G2G store for transactions.

## 2. ASCII Wireframe

```text
+-----------------------------------------------------------------------------+
|                                  NAVBAR                                     |
| [K] Kireiku       Services   Why Us   Testimonials   FAQ   ☀︎   [ORDER NOW]  |
+-----------------------------------------------------------------------------+
|                                                                             |
|                                   HERO                                      |
|                                                                             |
|                  ( * ) Trusted by 8,400+ gamers worldwide                   |
|                                                                             |
|                           LEVEL UP YOUR GAME,                               |
|                           WE HANDLE THE REST                                |
|                                                                             |
|          Professional game boosting services for Mobile Legends,            |
|          Valorant, Genshin Impact, and more. Fast, safe, reliable.          |
|                                                                             |
|               [ ORDER NOW -> ]      [ EXPLORE SERVICES ]                    |
|                                                                             |
|                                   [ v ]                                     |
+-----------------------------------------------------------------------------+
|                                SERVICES                                     |
|                                                                             |
|  +--------------------+  +--------------------+  +--------------------+     |
|  |  Game Image Card   |  | Game Image Card   |  |   Game Image Card   |     |
|  |  [🍁] Maple Story  |  | [⭐] Black Desert  |  | [🎯] Wuthering Waves|     |
|  |                    |  |                    |  |                    |     |
|  | Level up your char |  | Account Leveling   |  | Rank Boost         |     |
|  | Collect great items|  | Farming materials  |  | Iron to Radiant    |     |
|  |                    |  |                    |  |                    |     |
|  +--------------------+  +--------------------+  +--------------------+     |
|                                                                             |
+-----------------------------------------------------------------------------+
|                              WHY KIREIKU?                                   |
|                                                                             |
|    12,500+            8,400+             15+                5+              |
|  Total Orders    Happy Customers    Games Supported   Years Experience      |
|                                                                             |
|  [🛡️] Safety         [⚡] Fast          [💬] 24/7        [💰] Best Prices    |
+-----------------------------------------------------------------------------+
|                              TESTIMONIALS                                   |
|                                                                             |
|      <     [ ⭐⭐⭐⭐⭐ "Incredibly fast service!" - Alex R. ]     >         |
|                       . . o . .                                             |
+-----------------------------------------------------------------------------+
|                              HOW IT WORKS                                   |
|                                                                             |
|    ( 1 ) ----------> ( 2 ) ----------> ( 3 ) ----------> ( 4 )              |
| Choose Service    Order on G2G      We Get to Work     Done & Delivered     |
+-----------------------------------------------------------------------------+
|                                  FAQ                                        |
|                                                                             |
|  [+] Is my account safe during boosting?                                    |
|  [+] How long does the boosting process take?                               |
|  [-] What payment methods do you accept?                                    |
|      We accept all payment methods available on G2G, including cards...     |
+-----------------------------------------------------------------------------+
|                                 FOOTER                                      |
|                                                                             |
|  [K] Kireiku                Quick Links              Connect                |
|  Professional boosting      - Order on G2G           - Discord              |
|  trusted globally.          - Our Services           - Instagram            |
|                             - FAQ                                           |
|                                                                             |
|                            © 2026 Kireiku.                                  |
+-----------------------------------------------------------------------------+
```

## 3. User Flow Diagram

```mermaid
flowchart TD
    A[Visitor Lands on Home] --> B{Scrolls Page}
    
    B -->|Clicks 'Order Now'| C[External: Redirect to G2G Store]
    B -->|Clicks 'Explore Services'| D[Smooth Scroll to Services]
    
    B -->|Clicks Nav Links| E[Smooth Scroll to Anchor IDs]
    E -->|#services| D
    E -->|#why-us| F[View Stats & USPs]
    E -->|#testimonials| G[View Auto-playing Testimonials]
    E -->|#faq| H[Interact with FAQ Accordion]
    
    H -->|Click [+]| I[Expand Answer]
    
    B -->|Scrolls down| J[Navbar becomes sticky & blurred]
    J --> K[Scroll Spy updates active Nav item]
    
    B -->|Clicks Staff Login| L[Redirect to /admin/login]

    style C fill:#e63535,stroke:#fff,stroke-width:2px,color:#fff
    style L fill:#1e1e28,stroke:#2a2a35,color:#8888a0
```
