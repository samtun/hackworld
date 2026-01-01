# [1.7.0](https://github.com/samtun/hackworld/compare/v1.6.3...v1.7.0) (2026-01-01)


### Features

* add core trader npc to lobby ([ebfee71](https://github.com/samtun/hackworld/commit/ebfee71105e85622304d15c8524ff17b2b05c4c5))
* unify trader ui colors ([7df0c9b](https://github.com/samtun/hackworld/commit/7df0c9b45ddaaa370c3d3f5aa44dfe28135c7b30))

## [1.6.3](https://github.com/samtun/hackworld/compare/v1.6.2...v1.6.3) (2025-12-31)


### Bug Fixes

* fix comment in src/Player.ts ([1b3c552](https://github.com/samtun/hackworld/commit/1b3c552f1b42254324f419b1050e0af415dff8d1))
* fix double interaction on XDataManager ([af20c61](https://github.com/samtun/hackworld/commit/af20c612ab67747a268e56e1e1743da618d4ae97))
* fix errors in code ([77149c9](https://github.com/samtun/hackworld/commit/77149c979dec0d53d0102cc4730f4456874baadf))
* make uninitialized properties in Game.ts force initialized ([4cf17b3](https://github.com/samtun/hackworld/commit/4cf17b3cd3a9d50b8cf1e320cdfe7b9d54f2ca99))
* remove unused imports ([f85f1f3](https://github.com/samtun/hackworld/commit/f85f1f3ae201ac592c1e78c8f5a93be05a72f3f8))
* Update src/items/WeaponRegistry.ts ([638752a](https://github.com/samtun/hackworld/commit/638752a5c6bf9356e76b1c9d878de7aaaa01d57e))
* use improved position calculation for player ([95feb23](https://github.com/samtun/hackworld/commit/95feb2389abc15af73889af70544447e6de5de6a))

## [1.6.2](https://github.com/samtun/hackworld/compare/v1.6.1...v1.6.2) (2025-12-21)


### Bug Fixes

* fix Lobby references in dungeons ([8f7123a](https://github.com/samtun/hackworld/commit/8f7123a9ca55189b0aedae1acf5008d24e462e85))

## [1.6.1](https://github.com/samtun/hackworld/compare/v1.6.0...v1.6.1) (2025-12-21)


### Bug Fixes

* address code review feedback ([031c3fe](https://github.com/samtun/hackworld/commit/031c3fee45029e3e9663e8f207936b8775e9a106))
* enhance error handling for stage loading ([e2c8a88](https://github.com/samtun/hackworld/commit/e2c8a8812e8681195556f6e9240ecbf1a2483d29))
* fix saveManager select state on show ([764735b](https://github.com/samtun/hackworld/commit/764735bb061151a31b7e7d483616c3d359e0a7b9))

# [1.6.0](https://github.com/samtun/hackworld/compare/v1.5.1...v1.6.0) (2025-12-20)


### Bug Fixes

* add save manager NPC to cleanup and interaction list ([8e09c30](https://github.com/samtun/hackworld/commit/8e09c30d3d07a3fce67a73081c69b134d2fe3835))
* prevent instant save execution when opening Save Manager UI ([f1cff83](https://github.com/samtun/hackworld/commit/f1cff838e76b71d5e0d36b2832dbf665e03a0acf))


### Features

* add save manager system with NPC and UI ([8fb6c57](https://github.com/samtun/hackworld/commit/8fb6c57d1b8c1e57a5d6dd86553b417c8305b063))
* add savemanager to interactable entities ([7807c3d](https://github.com/samtun/hackworld/commit/7807c3df07cda52ca46033a3c49ab35f75f673fe))

## [1.5.1](https://github.com/samtun/hackworld/compare/v1.5.0...v1.5.1) (2025-12-20)


### Bug Fixes

* add proper type annotations for weapon drop methods ([1b5bb82](https://github.com/samtun/hackworld/commit/1b5bb8260a725b1ebbb32c53d2d1f75ae02d6c8a))
* make high drop chance behavior consistent ([a60e1ed](https://github.com/samtun/hackworld/commit/a60e1ed8641ba22d66a0a680f19ee8329c4412c8))

# [1.5.0](https://github.com/samtun/hackworld/compare/v1.4.0...v1.5.0) (2025-12-20)


### Bug Fixes

* use actual maxHp/maxTp values in XData UI instead of calculated values ([66d544e](https://github.com/samtun/hackworld/commit/66d544ec0293f18d657441cbca41922fc6af81d9))


### Features

* make level up heal player and increase HP and TP ([d18d19a](https://github.com/samtun/hackworld/commit/d18d19aa83000e7c50687ccf45564a38f22c0470))

# [1.4.0](https://github.com/samtun/hackworld/compare/v1.3.0...v1.4.0) (2025-12-20)


### Features

* minor fixes ([ed24699](https://github.com/samtun/hackworld/commit/ed246991fc83cbf5e0fc828b228b06a77e30d4f5))
* remove center obstacle from second dungeon ([b083be5](https://github.com/samtun/hackworld/commit/b083be5c27c7b52d566e0bd14d8d0e89f70f6d55))

# [1.3.0](https://github.com/samtun/hackworld/compare/v1.2.0...v1.3.0) (2025-12-20)


### Features

* add controller navigation to death overlay and reload stage on retry ([d31afe4](https://github.com/samtun/hackworld/commit/d31afe47be1e7da80c25ace34711a8da9ac7541c))
* implement player death system with respawn and lobby return ([b47e6ee](https://github.com/samtun/hackworld/commit/b47e6ee6ca27fbee0d424cdda4a508b81993a582))

# [1.2.0](https://github.com/samtun/hackworld/compare/v1.1.0...v1.2.0) (2025-12-20)


### Features

* add chip section to debug value editor ([8dc156e](https://github.com/samtun/hackworld/commit/8dc156e3ea2f054a8385c075fca829d966926322))
* add R3 button for debug mode toggle like F8 ([c3d4cd4](https://github.com/samtun/hackworld/commit/c3d4cd43d70205482dc1959b527c72d3f6829c6a))
* switch debug mode toggle to L3 button (left thumbstick press) ([3526169](https://github.com/samtun/hackworld/commit/3526169f7de28faffccd55d0f4120b071e5e557d))

# [1.1.0](https://github.com/samtun/hackworld/compare/v1.0.0...v1.1.0) (2025-12-20)


### Features

* add version display to start screen ([0341ce6](https://github.com/samtun/hackworld/commit/0341ce6365f3d7ba4431fcce5d73c3f2441a4fcb))

# 1.0.0 (2025-12-19)


### Features

* setup automated semantic versioning and release pipeline ([b36662a](https://github.com/samtun/hackworld/commit/b36662a7c48b347d013af814c2ba8c79b83ec777))
