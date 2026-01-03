# [1.9.0](https://github.com/samtun/hackworld/compare/v1.8.0...v1.9.0) (2026-01-03)


### Bug Fixes

* address PR feedback on level system ([7e89e92](https://github.com/samtun/hackworld/commit/7e89e92875774e3d8d13009055c5220b06345c1a))
* correct syntax error in Player.ts getWeaponRangeMultiplier ([7c9ba80](https://github.com/samtun/hackworld/commit/7c9ba80c614349518ea9de94605c0605d45e163d))
* update error message to be more generic ([029dc96](https://github.com/samtun/hackworld/commit/029dc9607528468bdcae6f5a1d57c82668a226b9))


### Features

* add level system to chip and core items ([55f6dd4](https://github.com/samtun/hackworld/commit/55f6dd4622cf1c7ad1e6c3f46f7295f54b6a13b5))


### Performance Improvements

* optimize determineDropLevel by checking roll early ([ac4a598](https://github.com/samtun/hackworld/commit/ac4a598061981815836f06454892ecd157de3e06))

# [1.8.0](https://github.com/samtun/hackworld/compare/v1.7.1...v1.8.0) (2026-01-02)


### Bug Fixes

* add only weapons to weapon trader inventory ([9f36546](https://github.com/samtun/hackworld/commit/9f36546c5c9991554487d52b2dba55f0b93b7b39))
* fix jumping after weapon drop pickup ([6caa876](https://github.com/samtun/hackworld/commit/6caa8764e2dc1a55489a85e259cf4f0a26a63e8f))
* fix passed argument ([da464a8](https://github.com/samtun/hackworld/commit/da464a8088bebfc00869b44ea0e4d198fd02539c))
* fix vulnerabilities in packages ([1fca22f](https://github.com/samtun/hackworld/commit/1fca22f741af1f20e222cc28d77c8c90ccc54a97))
* initial player and camera position bug ([c6da1f4](https://github.com/samtun/hackworld/commit/c6da1f47d143561082ac28c4b69e565fd7c1c96f))
* make cancelled charge attack wait player to press attack again ([a77c85d](https://github.com/samtun/hackworld/commit/a77c85d7d8c319cd95c9a2577da0931e43e963e4))
* make weapon drops show level properly ([3abb353](https://github.com/samtun/hackworld/commit/3abb353ae297915565e660f24d298225f8c827da))
* player jumping on scene switches ([02f54d4](https://github.com/samtun/hackworld/commit/02f54d4a0a5e9997227a0f68d6454629d684bae6))
* remove player from function call ([6abb9e3](https://github.com/samtun/hackworld/commit/6abb9e380941958ccc6872e9482aa3b0b88c5d24))
* remove player invulnerability while charging attack ([6c1c68b](https://github.com/samtun/hackworld/commit/6c1c68b9bcf8ff8933b63777a5983fb7e5e49a49))
* remove unnecessary physicsWorld parameter from chip and core drop methods ([e038a47](https://github.com/samtun/hackworld/commit/e038a47898446b37f2cf0d0ed956a3a141e94d6b))
* remove unnecessary physicsWorld parameter from drop creation ([6f9f07f](https://github.com/samtun/hackworld/commit/6f9f07fcca1f44ef00649e13c2653e8a51f02085))
* update Node.js version to 24.10.0 in workflow files ([93dc22a](https://github.com/samtun/hackworld/commit/93dc22a29f9d1610e08f8764d91cd82faabd2d73))


### Features

* add core and chip drops ([507287c](https://github.com/samtun/hackworld/commit/507287c42dccaa90386b825c3c5428da9828c0c8))
* add knockback to player on hit ([8216200](https://github.com/samtun/hackworld/commit/8216200ce20d59b87f6ce525b16dabaa58450c18))
* add tech and weapon levels to the save file ([0d7925b](https://github.com/samtun/hackworld/commit/0d7925bd0def89f7dbd6b32162451931a365ecb7))
* add weapon levels incl. debug view inputs ([3a93740](https://github.com/samtun/hackworld/commit/3a93740d1197ecfb33f8392c19f3510cb555f9c0))
* change base hp and tp values and stop player from moving while attacking ([6584a4e](https://github.com/samtun/hackworld/commit/6584a4ea833a3bc092f1ccf814fbd9c968f37232))
* display level on weapon drops in italic ([193ec07](https://github.com/samtun/hackworld/commit/193ec076425fc6e8fb845e56076a7a59bf118035))
* improve camera position ([f02679f](https://github.com/samtun/hackworld/commit/f02679f58a9ac71d67d1db827b0eccebc2e52c5f))
* increase enemy hp and lower large enemy exp ([9c737ba](https://github.com/samtun/hackworld/commit/9c737ba15eea4d2d3020ec5d955b06c94707a7b0))
* introduce tech point cap of 2500 ([dc59582](https://github.com/samtun/hackworld/commit/dc5958242d84a0aac172afbbbb5d176ab8d4707b))
* refine tech drop chance ([30e39fb](https://github.com/samtun/hackworld/commit/30e39fb864ca1caee42443cf9f0a5c5051029418))
* use actual drop rate for tech points ([df27108](https://github.com/samtun/hackworld/commit/df27108639f7d45a9902ff13ec68f18a7060c48d))

## [1.7.1](https://github.com/samtun/hackworld/compare/v1.7.0...v1.7.1) (2026-01-01)


### Bug Fixes

* fix call ([cc9222b](https://github.com/samtun/hackworld/commit/cc9222b4606b7ead4c0688ddef61e54c6664c306))
* healingstation code ([8b6af57](https://github.com/samtun/hackworld/commit/8b6af57437fa5195ae171f8fb216db445c14c9c2))
* update animations of meshes ([782abc1](https://github.com/samtun/hackworld/commit/782abc10e72b4c0c23bab522ca319798cdea2aa6))

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
