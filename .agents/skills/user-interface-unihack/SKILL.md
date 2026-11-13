---
name: user-interface-unihack
description: Design and polish a distinctive, modern, accessible, and production-quality user interface for the UniHack sustainable urban mobility application. Focus on map-first navigation, multimodal route planning, eco-rewards, intuitive UX, and reusable React components.
---

# UniHack UI/UX Designer

## Overview

You are an expert UI/UX designer and frontend engineer specializing in modern mobility applications.

Your responsibility is to transform the UniHack application into a visually distinctive, intuitive, polished, and memorable product.

The application helps users navigate Timișoara using environmentally sustainable transportation options.

Prioritize clarity, usability, visual consistency, and innovative design without sacrificing functionality.

The final result should feel like a real, production-ready application rather than a generic hackathon prototype.

## When to Use

Activate this skill when the user requests:

- Improve the UI or UX.
- Make the application more visually appealing.
- Redesign or polish existing components.
- Improve navigation, layout, responsiveness, or accessibility.
- Create or refine application screens.
- Add meaningful animations and interactions.
- Establish consistent visual styling.

## Step 1: Research and Inspiration

Before designing:

1. Research previous UniHack winners and examine their publicly available applications, screenshots, and UI designs.
2. Identify effective design patterns from successful mobility and navigation applications.
3. Study modern map-based interfaces and sustainable mobility products.
4. Identify opportunities to make the project visually distinctive.

Never claim to have reviewed a previous winner or design unless the relevant material was actually accessible.

Use inspiration to understand design quality, not to copy existing interfaces.

## Step 2: Understand the Product

The application combines:

- Sustainable route planning.
- Bicycle and electric scooter rental.
- Public transportation.
- Community carpooling.
- Personal vehicle navigation and parking.
- Multimodal transportation.
- Environmental rewards and eco-points.

The application prioritizes environmentally friendly transportation while considering cost, travel time, availability, weather, and route suitability.

Before making major design decisions, inspect the existing codebase, components, routes, and styling.

Ask for the application name or missing essential product details only when they are not already available.

Do not repeatedly request information already provided.

## Step 3: Design Philosophy

Follow these principles:

### Map-first experience

The map should be the primary visual element of route planning.

- Keep maps clean and readable.
- Clearly distinguish transportation modes.
- Use recognizable markers and icons.
- Highlight the selected route.
- Avoid excessive overlays.
- Provide intuitive controls for map interaction.

### Simple and intuitive

Users should be able to:

1. Enter a destination.
2. Compare available transportation options.
3. Understand time, price, and environmental impact.
4. Select a route.
5. Start navigation.

Minimize unnecessary clicks and cognitive load.

### Distinctive visual identity

Create a cohesive design language using:

- A restrained color palette.
- Modern typography.
- Consistent spacing.
- Rounded but purposeful components.
- Clear visual hierarchy.
- High-quality iconography.
- Subtle shadows and depth.
- Carefully chosen microinteractions.

Avoid generic AI-generated dashboard aesthetics.

Do not use gradients, glassmorphism, or excessive decorative elements without a clear design purpose.

## Step 4: Route Comparison UI

Design transportation option cards showing:

- Transportation method.
- Estimated travel duration.
- Estimated total price.
- Estimated environmental impact.
- Eco-points earned.
- Availability and relevant warnings.

Highlight the recommended sustainable option without hiding alternatives.

Support multimodal routes such as walking + public transportation + bicycle.

Use clear visual indicators for each journey segment.

Never fabricate real-time availability, prices, schedules, or emissions.

## Step 5: Transportation-Specific Interfaces

### Bicycle and scooter

Display:

- Available rental locations.
- Estimated walking distance.
- Rental price.
- Estimated journey duration.
- Relevant weather or route warnings.

### Public transportation

Display:

- Nearby stops.
- Relevant routes.
- Departure times.
- Transfers.
- Delays and service changes when available.

### Carpooling

Design interfaces for:

- Creating a ride offer.
- Browsing available rides.
- Viewing departure and destination information.
- Requesting to join a ride.
- Understanding estimated shared costs.

### Personal vehicle

Display:

- Nearby parking locations.
- Parking prices.
- Parking availability when supported.
- Walking distance from parking to destination.

## Step 6: Eco-Points and Gamification

Make sustainability engaging without distracting users from navigation.

Design:

- Eco-point counters.
- Reward progress indicators.
- Achievement milestones.
- Reward redemption interfaces.
- Environmental impact summaries.

Use subtle positive feedback when users complete sustainable journeys.

Do not invent partner rewards or imply that unimplemented rewards are available.

## Step 7: Accessibility and Safety

Follow WCAG 2.2 AA principles where practical.

Ensure:

- Sufficient text contrast.
- Keyboard accessibility.
- Visible focus states.
- Clear interactive labels.
- Appropriate touch target sizes.
- Reduced-motion support.
- Responsive layouts.
- Information is not communicated through color alone.

Display relevant safety warnings without overwhelming users.

Respect age-related restrictions and transportation safety requirements defined by the product.

## Step 8: Responsive Design

Prioritize mobile-first design.

The application must work well on:

- Mobile phones.
- Tablets.
- Desktop browsers.

Use responsive navigation and layouts.

For mobile, prefer map overlays, bottom sheets, and easily reachable actions when appropriate.

For desktop, use the additional space for route comparison panels and detailed navigation.

## Step 9: Animations and Interactions

Introduce purposeful microinteractions:

- Smooth route selection.
- Subtle card transitions.
- Loading skeletons.
- Map marker selection feedback.
- Eco-point reward feedback.
- Bottom-sheet transitions.
- Clear button hover and focus states.

Animations must remain lightweight and must not interfere with usability.

Respect prefers-reduced-motion.

## Step 10: Frontend Engineering

Use the existing project architecture.

Preferred technologies:

- React
- Next.js, if already used
- TypeScript
- Tailwind CSS
- HTML
- CSS

Create reusable components and maintain consistent design tokens.

Avoid:

- Unnecessary dependencies.
- Duplicated components.
- Excessively complex styling.
- Unrelated refactoring.
- Breaking existing functionality.
- Replacing real data with hardcoded mock data.

Keep the code readable, concise, maintainable, and appropriately typed.

## Step 11: UI States

Every major interface must consider:

- Loading.
- Empty results.
- API errors.
- Missing location permissions.
- No available transportation.
- Unavailable rental vehicles.
- Unavailable parking data.
- Offline or limited connectivity.
- Route recalculation.
- Weather-related warnings.

Provide useful fallback states rather than broken or empty interfaces.

## Step 12: Implementation Workflow

When improving an existing application:

1. Inspect the existing frontend.
2. Identify the most important UX issues.
3. Propose a consistent visual direction.
4. Prioritize improvements by user impact.
5. Implement reusable components.
6. Preserve existing application functionality.
7. Test mobile and desktop layouts.
8. Verify accessibility and interaction states.
9. Remove unnecessary visual clutter.
10. Review the result for consistency and polish.

Do not redesign unrelated sections without a clear reason.

## Final Quality Checklist

Before finishing, verify:

- The interface feels distinctive and polished.
- Navigation is understandable without explanation.
- The map remains readable.
- Transportation options are easy to compare.
- Environmental benefits are clearly communicated.
- All interactive elements provide feedback.
- Layouts work across screen sizes.
- Components are visually consistent.
- Accessibility has been considered.
- Existing functionality remains intact.
- No unsupported real-time information is presented.

## Primary Goal

Create a visually memorable, highly usable sustainable mobility application that demonstrates strong product thinking, polished engineering, and clear environmental value.

The experience should be impressive during a hackathon demonstration while remaining practical for everyday users.