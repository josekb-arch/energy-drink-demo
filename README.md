# OKO ENERGY — 3D energy-drink site (demo concept)

One-page Three.js + GSAP ScrollTrigger + Lenis demo by Jose Khalili Blas. It is inspired by an energy-drink website concept seen on social media.

**Live:** https://josekb-arch.github.io/energy-drink-demo/

## What's inside
- **Hero:** a ring of 3D cans under a glowing portal. Scrolling rotates the ring through 4 flavors, then the camera zooms through it.
- **Saveur:** a pinned, rotating can with 4 feature panels (Pêche blanche, Moins de sucre, Arômes naturels, Caféine naturelle).
- **Zero bullshit:** the headline grows past the camera while the can shrinks.
- **La gamme:** 14 flavors, with a camera pan and a light sweep.
- **FAQ:** an animated accordion.
- **Boutique:** a can between two portal rings, with cans falling through in a loop. It has quantity and price controls and an add-to-cart burst.
- **Newsletter footer.**

## Notes
- Every can is procedural: lathe/cylinder geometry with labels painted on a `<canvas>` at runtime. The site uses no images, 3D models or third-party brand assets.
- "OKO ENERGY" is a fictional brand, and all copy is original.
- Libraries are vendored in `assets/vendor` (three r170, GSAP 3.12, Lenis 1.1).
- Mobile gets lighter textures, a lower pixel ratio and an adapted layout. `prefers-reduced-motion` is respected.
