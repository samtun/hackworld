# [3.19.0](https://github.com/samtun/hackworld/compare/v3.18.0...v3.19.0) (2026-05-18)


### Bug Fixes

* refine procedural audio feedback ([548896a](https://github.com/samtun/hackworld/commit/548896ac5610ab32db2903c53c78fa7986906778))
* restore stable web audio engine ([54e30dd](https://github.com/samtun/hackworld/commit/54e30dd353beaf2ad0ee50be4b9f231fc4f0bcc1))


### Features

* add healing station loop audio ([68e8660](https://github.com/samtun/hackworld/commit/68e86608c9460ac24ce12c2891c89167410b8787))
* add procedural action audio hooks ([3b00df7](https://github.com/samtun/hackworld/commit/3b00df72ad5e915215e83032af441a077ca0c7fe))
* add skill audio cues ([937d7c3](https://github.com/samtun/hackworld/commit/937d7c3f7aea33cf855c5c0f592f36d14827d57c))
* add ui open close and failure audio ([589c682](https://github.com/samtun/hackworld/commit/589c682b80bb567ae6778b771bcb57dfb2a16597))
* add UI sounds and longer music loops ([1060bdd](https://github.com/samtun/hackworld/commit/1060bdd5e10f50364fa55802c0d6f2755ad75b4a))
* expand inventory and level audio ([7a29bd9](https://github.com/samtun/hackworld/commit/7a29bd9e4e3c4d9b4bd3906a2fdcdd3f6c0dab18))
* expand menu and card audio feedback ([261ee01](https://github.com/samtun/hackworld/commit/261ee01a8121a16298bb493ff9aa4ccf6852c094))
* upgrade game audio with tonejs ([deabe06](https://github.com/samtun/hackworld/commit/deabe06b49fced009da56447792cdf89625d5ddf))

# [3.18.0](https://github.com/samtun/hackworld/compare/v3.17.0...v3.18.0) (2026-05-16)


### Bug Fixes

* correct 13 stale test expectations to unblock CI deployment ([1921e32](https://github.com/samtun/hackworld/commit/1921e327274d670dc5b13c5946f16c9e5ab1c944))


### Features

* add lobby teleporter to dungeon stages and apply death penalty ([76a7cb6](https://github.com/samtun/hackworld/commit/76a7cb67a1ad6173538ea4d57fa2b8095fe07ac7))
* show death penalty on death screen instead of floating indicators ([7e4a2b5](https://github.com/samtun/hackworld/commit/7e4a2b55b67ffb1378fd57ffdbb0abc2d700564e))

# [3.17.0](https://github.com/samtun/hackworld/compare/v3.16.0...v3.17.0) (2026-04-30)


### Bug Fixes

* add corrected A.001 card images ([ce1e0f9](https://github.com/samtun/hackworld/commit/ce1e0f9897780ea3255a57364546d6bc59d1e052))
* remove card image overlay, fix hover scrollbar ([e5d3cc2](https://github.com/samtun/hackworld/commit/e5d3cc250056cc67352fe6d5852cbbded6774a07))


### Features

* add A.002 images ([008a811](https://github.com/samtun/hackworld/commit/008a811e32b4e9dc2524c5c884f992109e01f733))
* add card images for A.001 ([4ca5dac](https://github.com/samtun/hackworld/commit/4ca5dac3fd2f5fddfd6533cead1690bbc6202826))
* card overlay, aspect ratio, hover scale, lightbox ([71fad8b](https://github.com/samtun/hackworld/commit/71fad8baf0724645636886045c1c6c35c36c735e))
* clean card thumbnails, locked ?, pack count visibility, block obfuscation ([be139fe](https://github.com/samtun/hackworld/commit/be139fedc67d74f96a59723ff44871682745c516))
* show card images as backgrounds in card manager UI ([2c12773](https://github.com/samtun/hackworld/commit/2c127734fabc1f724695d6b4b98b54b64501a4dd))

# [3.16.0](https://github.com/samtun/hackworld/compare/v3.15.0...v3.16.0) (2026-04-29)


### Features

* reduce rendering calls on card manager UI by adding needsRender dirty flag ([d89c36c](https://github.com/samtun/hackworld/commit/d89c36c1879e7af36a34d65a2aa83a48b621f883))

# [3.15.0](https://github.com/samtun/hackworld/compare/v3.14.0...v3.15.0) (2026-04-27)


### Bug Fixes

* address code review feedback on enemy stuck fix and boss force field ([6fd5d47](https://github.com/samtun/hackworld/commit/6fd5d4714f4359dc5097bec973425bfee4a7c7a1))
* cap enemy radius (not size) to corridor half-width minus buffer; bosses uncapped ([fe4de4b](https://github.com/samtun/hackworld/commit/fe4de4b57aa3cc52c6e2f1f11bc899613385bfc5))
* floor critical skill damage ([01bf481](https://github.com/samtun/hackworld/commit/01bf481cf1f6a52b7321b41b6bda9c23e5cab479))
* reduce max enemy radius to ensure corridor passage ([8f081ea](https://github.com/samtun/hackworld/commit/8f081ea1559ac76c11fc707a5dd9d3579d08a57e))
* refine weapon drop bonus calculation for better balance and consistency ([ad816c7](https://github.com/samtun/hackworld/commit/ad816c7276c777ca87170a75db206f5cfd30e8f7))


### Features

* enemy size cap, stuck detection with barrel breaking, and boss room force field ([d8c2c63](https://github.com/samtun/hackworld/commit/d8c2c6397a131c45c4044d077374dc76dab320b2))

# [3.14.0](https://github.com/samtun/hackworld/compare/v3.13.0...v3.14.0) (2026-04-27)


### Bug Fixes

* clean up formatting and restore control hints setting in Game class ([e43044a](https://github.com/samtun/hackworld/commit/e43044a0c1a81730e4073cc491e75833124441e8))


### Features

* add option to toggle control hints in pause menu ([8916012](https://github.com/samtun/hackworld/commit/8916012a267e00b84468870de75f710af711ffe9))

# [3.13.0](https://github.com/samtun/hackworld/compare/v3.12.0...v3.13.0) (2026-04-26)


### Bug Fixes

* update album banner per review feedback ([a9b6dce](https://github.com/samtun/hackworld/commit/a9b6dce4ffb0c43d08f98aa9a8be7fae433b8980))


### Features

* show album complete banner from DebugValueEditor ([2e88447](https://github.com/samtun/hackworld/commit/2e88447d66cabfa5bc90aebc67d83ba17c51c2f0))
* show cinematic album complete banner on album completion ([d295f1e](https://github.com/samtun/hackworld/commit/d295f1e186f8b4d7692e3871b512f96baf407458))

# [3.12.0](https://github.com/samtun/hackworld/compare/v3.11.0...v3.12.0) (2026-04-26)


### Bug Fixes

* decrease enemy inactive duration at spawn ([e6aabbc](https://github.com/samtun/hackworld/commit/e6aabbc208a6d5a59544076879dbc4bf5c326c5d))
* newly spawned enemies stay inactive for 1 second after room entry ([80aae2d](https://github.com/samtun/hackworld/commit/80aae2d041a42b304bca1b19cc0ec1f453199a94))


### Features

* spawn enemies lazily when player enters their room ([6590445](https://github.com/samtun/hackworld/commit/65904459f476f0834aa1b89243970c17db1a6b0b))

# [3.11.0](https://github.com/samtun/hackworld/compare/v3.10.0...v3.11.0) (2026-04-26)


### Features

* item comparison — show stat delta when hovering/selecting equippable items ([c62bfd7](https://github.com/samtun/hackworld/commit/c62bfd7897a6b70acc5321e491e63de265bc9800))

# [3.10.0](https://github.com/samtun/hackworld/compare/v3.9.0...v3.10.0) (2026-04-26)


### Bug Fixes

* update tech level display format in inventory ([1361afb](https://github.com/samtun/hackworld/commit/1361afb199ee0d80a5ecc85b632c12b2679468d9))


### Features

* show tech level in inventory on tech points ([926ec4c](https://github.com/samtun/hackworld/commit/926ec4c2742fa2ab083faf3c94353f9068f84ef5))

# [3.9.0](https://github.com/samtun/hackworld/compare/v3.8.0...v3.9.0) (2026-04-26)


### Features

* add teleporter direction arrow to minimap with fade in/out ([b20a24f](https://github.com/samtun/hackworld/commit/b20a24f7aa14776369f1cb3f0f3031d5bf55ecad))
* improve minimap teleporter marker color ([213516e](https://github.com/samtun/hackworld/commit/213516eaae7c8cce6377f7b72459bf5e59572d19))
* mark cleared rooms in gray on the minimap ([5ed8b8f](https://github.com/samtun/hackworld/commit/5ed8b8f8ef153877fae1b8e124ad06e1aa1d668a))

# [3.8.0](https://github.com/samtun/hackworld/compare/v3.7.0...v3.8.0) (2026-04-24)


### Features

* add five-stage progression and configurable enemy archetypes ([93b5492](https://github.com/samtun/hackworld/commit/93b5492d2af818ab62d0bcca9e9c9d038c863359))
* improve xData indicator color ([7f862d3](https://github.com/samtun/hackworld/commit/7f862d34b77d921c9b99bf39134b496716ab4a5f))
* raise stage damage scaling and rename elite spawn types ([4ef730b](https://github.com/samtun/hackworld/commit/4ef730b1959e3ea0f4fcc30cb9edfce638788f97))

# [3.7.0](https://github.com/samtun/hackworld/compare/v3.6.2...v3.7.0) (2026-04-22)


### Bug Fixes

* hide lobby minimap and add player-following tilted map view ([2ce3e88](https://github.com/samtun/hackworld/commit/2ce3e88111e496ec899bcdc222603050321ee33b))
* reduce minimap background alpha and fade edges to transparency ([cac6020](https://github.com/samtun/hackworld/commit/cac60208f01186e030df5160f671c4bde0a6dd82))


### Features

* add minimap teleporter marker and fix Grid Tracer label billboarding ([aad67bc](https://github.com/samtun/hackworld/commit/aad67bc993d74d1657a0d36e5283f2946c49322b))
* add minimap unlock item and stage minimap rendering ([95bc29c](https://github.com/samtun/hackworld/commit/95bc29cd46ab7db0f59811d2300738274e38515a))
* display more of the world on the minimap ([c413ea4](https://github.com/samtun/hackworld/commit/c413ea4cac4fe2e2b3880fd848837fe6af1ae2a9))
* increase minimap marker size ([5e274ea](https://github.com/samtun/hackworld/commit/5e274eaf61afff3bda3b5db8adfc10bf11707df3))

## [3.6.2](https://github.com/samtun/hackworld/compare/v3.6.1...v3.6.2) (2026-04-22)


### Bug Fixes

* accumulate fractional healing station recovery ([1b57191](https://github.com/samtun/hackworld/commit/1b57191409a73ee4a5982cafb021843678b2ae52))
* restore continuous tp healing at stations ([b94bf5a](https://github.com/samtun/hackworld/commit/b94bf5a9ec7666ca39e6e753e6eb9a6d32815980))

## [3.6.1](https://github.com/samtun/hackworld/compare/v3.6.0...v3.6.1) (2026-04-08)


### Bug Fixes

* suppress B button block after closing a menu ([0cb96e9](https://github.com/samtun/hackworld/commit/0cb96e9c96ae2e7376f36a82b94244fc35fdb84f))

# [3.6.0](https://github.com/samtun/hackworld/compare/v3.5.0...v3.6.0) (2026-04-08)


### Bug Fixes

* clear velocity on enemy death to prevent positioning drift ([8c6328c](https://github.com/samtun/hackworld/commit/8c6328c1c4d9745966cc155984bf66279e5d5df9))
* dynamic floor-height shadows using downward CANNON raycasts; slope alignment via quaternion ([d6feb31](https://github.com/samtun/hackworld/commit/d6feb318263085d39eeeb7cc27d6ab7bdc636c8b))
* enemy shadow tracks body position during death; shadows always visible ([73a3681](https://github.com/samtun/hackworld/commit/73a3681e4c1a0d5563eb330fa27f7a8a87d56b48))
* remove blurry FXAA pass ([e62ee4a](https://github.com/samtun/hackworld/commit/e62ee4a58643f6ec7840b7bf75efce2fde6d5e7c))


### Features

* add blob shadows to player, enemies and NPCs ([44fc58a](https://github.com/samtun/hackworld/commit/44fc58ade492cbfb257b33af8081ef9564ac506a))
* scale player shadow by ground height; slide enemy shadow during death animation ([ad7eb92](https://github.com/samtun/hackworld/commit/ad7eb928321d3aaa354a54cebef9a83a57991592))

# [3.5.0](https://github.com/samtun/hackworld/compare/v3.4.0...v3.5.0) (2026-04-08)


### Bug Fixes

* remove R1 from block; only B (controller) and L (keyboard) block ([b3b5020](https://github.com/samtun/hackworld/commit/b3b50203a5bb3e18a32bf05635b88dd77eb454df))


### Features

* make B on controller execute a block when no menu is open ([a29cc99](https://github.com/samtun/hackworld/commit/a29cc99a7a466da0538cefdcd50472dab7118bba))

# [3.4.0](https://github.com/samtun/hackworld/compare/v3.3.0...v3.4.0) (2026-04-07)


### Bug Fixes

* make traps only damage player when touching the ground ([acd5262](https://github.com/samtun/hackworld/commit/acd5262f4dac8094842064ae70103fa19a38ad6b))
* trap tests ([c3a22df](https://github.com/samtun/hackworld/commit/c3a22df68e34d970de958d57e6006dbeb8f77b52))


### Features

* enhance player and electric trap interactions with ground detection ([cc49d8b](https://github.com/samtun/hackworld/commit/cc49d8b9244aa4e1588601852ec524b0b57588ee))

# [3.3.0](https://github.com/samtun/hackworld/compare/v3.2.0...v3.3.0) (2026-04-07)


### Features

* revise chip and core trader inventories to be player-level-aware ([9878568](https://github.com/samtun/hackworld/commit/9878568cdb2e1e66b0a993aaee2f448e6f608101))

# [3.2.0](https://github.com/samtun/hackworld/compare/v3.1.0...v3.2.0) (2026-04-07)


### Bug Fixes

* compute initial BokehPass focus from camera offset ([d12a2cd](https://github.com/samtun/hackworld/commit/d12a2cd0ecb47f4472c53c85f4c86ffb9f8be1fd))
* restrict DoF to far-field only and add FXAA anti-aliasing ([5e398ed](https://github.com/samtun/hackworld/commit/5e398ed44f438ed1dee53b2e4e0c831160a3a0f9))


### Features

* add bloom and depth-of-field post-processing effects ([83e9f97](https://github.com/samtun/hackworld/commit/83e9f974500fa28ab50a7e7ed071f2a97d2a348c))
* remove bokeh pass ([24d8cd6](https://github.com/samtun/hackworld/commit/24d8cd6d4c522e1555d4abf1b43b8d7bc08e8eaf))

# [3.1.0](https://github.com/samtun/hackworld/compare/v3.0.1...v3.1.0) (2026-04-07)


### Features

* add Razorwire and Patchwork chip types ([81675f8](https://github.com/samtun/hackworld/commit/81675f8b21ea1e78f9652b76955f225bfecc2f8b))

## [3.0.1](https://github.com/samtun/hackworld/compare/v3.0.0...v3.0.1) (2026-04-07)


### Bug Fixes

* apply wall trim to all corridors and extend colliders to all walls ([51d8674](https://github.com/samtun/hackworld/commit/51d86747bfa3928eedf8bdd1ef114620b55e765a))
* eliminate room wall corner z-fighting by trimming N/S walls to T-junctions ([998ac8a](https://github.com/samtun/hackworld/commit/998ac8ad7dd8f4fbb73eb9f02ba15d380c9236af))
* extend corridor wall colliders 10m up and fix sloped corridor wall visual height ([adeaccf](https://github.com/samtun/hackworld/commit/adeaccf48c2288cabaddc8ee97e47379eb2f19e1))
* trim sloped corridor wall mesh height to eliminate z-fighting at room junctions ([e1e7cd8](https://github.com/samtun/hackworld/commit/e1e7cd8f68dceabdf9262a72cecb593dbd82a5fe))

# [3.0.0](https://github.com/samtun/hackworld/compare/v2.4.0...v3.0.0) (2026-04-02)


* feat!: rework loot chests to spawn item drops instead of showing UI ([4dfbe28](https://github.com/samtun/hackworld/commit/4dfbe28b2c3f1a2b8f90c085c2a4d4748c0553bc))


### Bug Fixes

* address code review - guard Math.log10 and extract magic constant ([683a24c](https://github.com/samtun/hackworld/commit/683a24cfc301f7a358e1509c2e9708c84ebd4585))
* spawn drops at fixed +Z position in front of chest instead of toward player ([5191a0a](https://github.com/samtun/hackworld/commit/5191a0a8d28223cfd9d036949de43f0f0cd3a2c3))


### BREAKING CHANGES

* ChestUI removed. Chests now spawn 1-3 item drops (weapons,
chips, cores, potions, money) in front of the chest on interaction.
Chest color reflects item tier (orange for ZeroDay/Leet, gray/brown otherwise).

Agent-Logs-Url: https://github.com/samtun/hackworld/sessions/381d0fc9-b5b7-49b0-8226-a8366fb7ff72

# [2.4.0](https://github.com/samtun/hackworld/compare/v2.3.0...v2.4.0) (2026-04-02)


### Bug Fixes

* address mobile UI review feedback ([d027471](https://github.com/samtun/hackworld/commit/d027471b48802b3846b54c375de23fbdc0940ecd))
* increase barrel fragment gravity test frames to prevent flaky failure ([aaa0a15](https://github.com/samtun/hackworld/commit/aaa0a1523bb448daa839d33dd1c8dd11dcb1ca68))
* suppress jump after menu close by consuming A-button until released ([a070614](https://github.com/samtun/hackworld/commit/a0706149f099bce365cfead173d14c426e507925))
* vertically center inventory toggle button and fix stat allocation breaking slider ([14e5126](https://github.com/samtun/hackworld/commit/14e5126f55cc4841f9baaf0891e3ca991bfb3c9b))


### Features

* fix mobile controls and visuals ([835cb3d](https://github.com/samtun/hackworld/commit/835cb3d682ecb2dfb8327cfba166a004c036b3ec))

# [2.3.0](https://github.com/samtun/hackworld/compare/v2.2.0...v2.3.0) (2026-04-01)


### Bug Fixes

* address review feedback - fix weapon name, remove rooms, fix enemy flash, add spawn indicator ([9bf814c](https://github.com/samtun/hackworld/commit/9bf814cf5cb3eff2238fb356d315856f89b9fd3a))
* adjust spawn area positions for enemy, item grid, barrel, and chest ([c4a249b](https://github.com/samtun/hackworld/commit/c4a249bee3b1a9d3a05abe8553095abac834066d))


### Features

* improve GameTest stage with enemy spawn buttons, rooms, item grid, and barrel/chest areas ([ec37940](https://github.com/samtun/hackworld/commit/ec37940908eb13db04b8801d81b5b1f963d4414f))

# [2.2.0](https://github.com/samtun/hackworld/compare/v2.1.0...v2.2.0) (2026-03-31)


### Features

* add HP and TP potion drop items ([e99a777](https://github.com/samtun/hackworld/commit/e99a777f1528163feed8dd8a501850a167abb898))
* rename MovementTest to GameTest and add potion test drops ([ebf6f38](https://github.com/samtun/hackworld/commit/ebf6f386759c804fc6c8f84933477b5d6e4da60b))
* scale potion ball radius by level for better readability ([8bf2835](https://github.com/samtun/hackworld/commit/8bf28356b22ad255732a94a2f3d39f91c768f342))

# [2.1.0](https://github.com/samtun/hackworld/compare/v2.0.0...v2.1.0) (2026-03-31)


### Bug Fixes

* require ESC release before closing pause menu and disable Restart Area in lobby ([820acd9](https://github.com/samtun/hackworld/commit/820acd9f65db9756c82685475a619589f50a6db2))


### Features

* add pause menu with Continue, SSAO toggle, and Restart Area options ([b10b6f3](https://github.com/samtun/hackworld/commit/b10b6f33d018bda6a9dfbe0ae6b291598b3f3546))
* persist Performance Mode setting in localStorage ([6c68a36](https://github.com/samtun/hackworld/commit/6c68a3644c5fb761b9748665dbd50a7ecad9acfe))

# [2.0.0](https://github.com/samtun/hackworld/compare/v1.63.0...v2.0.0) (2026-03-31)


* feat!: introduce rooms on various heights with corridor ramps ([be12435](https://github.com/samtun/hackworld/commit/be12435f38ba3b054bba66184719e9a89910b5a2))


### Bug Fixes

* adjust dimensions of shared geometry for barrel fragments ([00dfa15](https://github.com/samtun/hackworld/commit/00dfa1555a5bc94e042c290ca4ffbce4a0658a3e))
* adjust enemy count area per enemy and chests per loot room in NetworkMatrix and SecurityCore ([b0eac85](https://github.com/samtun/hackworld/commit/b0eac85015df5cb85e7fea1dcdafd28c035b008c))
* adjust enemy count limits in NetworkMatrix and SecurityCore stages ([670595e](https://github.com/samtun/hackworld/commit/670595e3617400087d08e893c216f90ddd132d5e))
* adjust ramp body position to account for floor thickness ([a773f03](https://github.com/samtun/hackworld/commit/a773f034e3246eb9c543d7fc93044b3f9c2ebb27))
* adjust sell prices for chips, cores, and weapons to balance economy ([6a0f4f3](https://github.com/samtun/hackworld/commit/6a0f4f36901ebbc3b0982a3b250579b4fbf34b8a))
* enforce safe room elevation to 0 in createRoom ([8cfda60](https://github.com/samtun/hackworld/commit/8cfda60b871bd023d15f748e857b347805acbbe3))


### BREAKING CHANGES

* stage geometry data model changed

Agent-Logs-Url: https://github.com/samtun/hackworld/sessions/a1a91180-5e98-4c7e-a127-b80235643ba9

# [1.63.0](https://github.com/samtun/hackworld/compare/v1.62.0...v1.63.0) (2026-03-30)


### Features

* add destruction animation to breakable barrels ([b028438](https://github.com/samtun/hackworld/commit/b028438c8c37cbf7d129c00a03511be871c9425b))

# [1.62.0](https://github.com/samtun/hackworld/compare/v1.61.0...v1.62.0) (2026-03-30)


### Bug Fixes

* address code review feedback for electric traps ([488bb68](https://github.com/samtun/hackworld/commit/488bb68d91dbdb008e113f9bd9cacfd512a63f23))
* improve electric trap shader visibility and texture tiling ([3b74788](https://github.com/samtun/hackworld/commit/3b747887bac3c01d865aade4da8f80a08df4ac98)), closes [#DDDDDD](https://github.com/samtun/hackworld/issues/DDDDDD)
* make particles visible ([5ddb02a](https://github.com/samtun/hackworld/commit/5ddb02a3898d7496727911e7088549e59e827310))
* prevent enemies and barrels from spawning on trap positions ([959fb30](https://github.com/samtun/hackworld/commit/959fb30c5fcf281c1914cffd02b83dbe0bcb95df))


### Features

* add electric traps to dungeon stages ([ace163b](https://github.com/samtun/hackworld/commit/ace163b371503449bead56fc21c2b2ef949bd03d))
* improve trap visibility ([d112831](https://github.com/samtun/hackworld/commit/d1128319580c20589678ac2d5b51bc2c47c23e8f))

# [1.61.0](https://github.com/samtun/hackworld/compare/v1.60.0...v1.61.0) (2026-03-30)


### Features

* sort inventories when opening trader, chest, and player inventory ([34a9f34](https://github.com/samtun/hackworld/commit/34a9f341c902b47051c01eea6c95860dcca26145))

# [1.60.0](https://github.com/samtun/hackworld/compare/v1.59.0...v1.60.0) (2026-03-30)


### Features

* improve loot crate drop rates ([7703d0e](https://github.com/samtun/hackworld/commit/7703d0e6437191e21c53778bba48def9664a5e97))

# [1.59.0](https://github.com/samtun/hackworld/compare/v1.58.1...v1.59.0) (2026-03-30)


### Features

* add ssao ([edceeb5](https://github.com/samtun/hackworld/commit/edceeb5e1291521f41d93631dc4bbd97f11a6046))
* implement separate camera for floating indicators and adjust rendering layers ([81d82ea](https://github.com/samtun/hackworld/commit/81d82ea6d5842955ba525d3685045f611ca95169))

## [1.58.1](https://github.com/samtun/hackworld/compare/v1.58.0...v1.58.1) (2026-03-30)


### Bug Fixes

* limit level-up shockwave damage to enemies within 15m range ([e6301ed](https://github.com/samtun/hackworld/commit/e6301ed644ac68472ff095284c19f3ebc685591c))
* reduce level up shockwave range ([9638d3d](https://github.com/samtun/hackworld/commit/9638d3d438fe3e5396ae416afd9300b7a066c723))

# [1.58.0](https://github.com/samtun/hackworld/compare/v1.57.0...v1.58.0) (2026-03-30)


### Bug Fixes

* allow chest reopening, add opened lid visual, fix item counts and barrel weapon collision ([9070e18](https://github.com/samtun/hackworld/commit/9070e18dcd241329d85f8c341e24829c0052b7eb))
* barrel STATIC body with manual weapon check and chest lid direction ([e57f2ff](https://github.com/samtun/hackworld/commit/e57f2ff45bd2f754885d4eeb2f49e836c232dd37))
* chest lid rotation, collider heights, loot rooms, barrel shape and weapon collision ([b1c4742](https://github.com/samtun/hackworld/commit/b1c4742cbc4e1107daee73eab3c6c72082b2bcc5))
* use breakable entity shape radius instead of magic number ([29752c8](https://github.com/samtun/hackworld/commit/29752c8998a3f9caaecd55a31f01530cfbc5c537))


### Features

* add Breakable interface for destructible entities ([bab6bdd](https://github.com/samtun/hackworld/commit/bab6bdd8a103ae03e977fc7bc37d7e74fe85e730))
* add loot chests and breakable barrels ([d7c86a6](https://github.com/samtun/hackworld/commit/d7c86a6a4f9cbcb142815dd8b60e31d0846b736b))

# [1.57.0](https://github.com/samtun/hackworld/compare/v1.56.2...v1.57.0) (2026-03-30)


### Bug Fixes

* align wall panel seams with geometry edges, add obstacle brightness gradient ([64526a1](https://github.com/samtun/hackworld/commit/64526a19e1f95598d3a4d38328c7cf93cb103c1d))
* align wall seams with geometry edges, limit obstacle fade to 1m, add procedural normal maps ([673298a](https://github.com/samtun/hackworld/commit/673298afd4b8162ad8ace49cac30c34fa2761b07))
* ensure obstacle components always scroll upward in world space ([37d1b8c](https://github.com/samtun/hackworld/commit/37d1b8c5c22ab7a5fee513282fbff8a881a0c20d))
* offset N/S walls to prevent z-fighting, add obstacle component scroll animation ([5c23478](https://github.com/samtun/hackworld/commit/5c234786849c77b1386b67c27c0cd138403e44a3))
* reduce procedural bump normal intensity to prevent oversharpening ([adb1f88](https://github.com/samtun/hackworld/commit/adb1f882e6faaec104cab97296cdb5915d034b28))
* remove procedural bump normals from all shaders and fix wall z-fighting ([2577293](https://github.com/samtun/hackworld/commit/257729341ad993cb860d952376ca72a1863b2e7e))
* use tri-planar projection for walls/obstacles, per-stage floor colors, dark obstacle tops ([968182e](https://github.com/samtun/hackworld/commit/968182ebc90757ab676081eb5112c43e32e73486))


### Features

* add procedural shaders for stage walls, floor, and obstacles ([838aea9](https://github.com/samtun/hackworld/commit/838aea9d37b1d6f2d8f1eec081e99ce79eda0a26))
* enhance wall shader with FBM grain, scratches, brush marks, and smudges ([b9f223c](https://github.com/samtun/hackworld/commit/b9f223c4cfdb28cef1e5f52b86c49a9de79b0739))
* speed up obstacle shader movement ([5192710](https://github.com/samtun/hackworld/commit/5192710f8423ec7a69d5e032aab687b46d07359b))

## [1.56.2](https://github.com/samtun/hackworld/compare/v1.56.1...v1.56.2) (2026-03-30)


### Bug Fixes

* main menu does not work on mobile ([c45c7a0](https://github.com/samtun/hackworld/commit/c45c7a024ef4fcf56cb2f6e7b7342c1a29577a3b))

## [1.56.1](https://github.com/samtun/hackworld/compare/v1.56.0...v1.56.1) (2026-03-30)


### Bug Fixes

* reset effectTimer in AreaAttackSkill execute and clamp LaserBeamSkill range ([63715e5](https://github.com/samtun/hackworld/commit/63715e5d4c6ad004eadeaabfd21675c59f20eee5))

# [1.56.0](https://github.com/samtun/hackworld/compare/v1.55.1...v1.56.0) (2026-03-30)


### Bug Fixes

* centre teleporter in its room for accessibility from all sides ([1e25f6e](https://github.com/samtun/hackworld/commit/1e25f6eec052a56dcded9ac22362228a0047c753))
* localise wall transparency to player area, disable wall shadows, fix floor gaps ([7e32378](https://github.com/samtun/hackworld/commit/7e32378a756aa4503f93b1ca59956792133a8d50))
* make test WeaponDrops despawn when leaving MovementTest stage ([685d930](https://github.com/samtun/hackworld/commit/685d93068a5a3a875abb14d09d8ece114c550fee))
* teleporter activation, room sizes, enemy count, obstacles ([a1c54f8](https://github.com/samtun/hackworld/commit/a1c54f83e2da39c988e4970cf159329a4c76fd3d))


### Features

* add procedurally generated environments to dungeon stages ([53d6027](https://github.com/samtun/hackworld/commit/53d6027e8955c49eda242a30e99695645cbd413b))
* apply wall transparency shader to obstacles ([1279e14](https://github.com/samtun/hackworld/commit/1279e146a7539ab09c7351fd854ae1cf5e2ed16a))
* branching room layout, dedicated teleporter room, grid-snapped obstacles ([2292632](https://github.com/samtun/hackworld/commit/229263265caca66166af9de0da0e42804cad54b1))
* change weapon tier colors ([b3fee8a](https://github.com/samtun/hackworld/commit/b3fee8a557850db15fc6654e2b39cde6d114d5dc))
* decrease enemy item drop rate ([312fc5d](https://github.com/samtun/hackworld/commit/312fc5d8ba9310abcc5c200a04911ffa975952dc))
* enable enemy aggro on damage from outside room ([1b522d7](https://github.com/samtun/hackworld/commit/1b522d787b3e364ffc24ebce45d4472713da4d61))
* increase room sizes 1.3x, halve enemy spawns, 2m obstacles, A* pathfinding ([437f7d1](https://github.com/samtun/hackworld/commit/437f7d1bbe60008436005226aa15e0f6c795a9f9))
* larger teleporter room, wall transparency shader, per-room floor segments ([be79d5f](https://github.com/samtun/hackworld/commit/be79d5f763b2cc9148d578c0586eefa43cdcb586))
* reduce wall shader alpha mask size ([d53e633](https://github.com/samtun/hackworld/commit/d53e633f75806dc7935033523f20a79d09fb1b6f))
* room-based procedural dungeon generation with enemy room aggro and teleporter activation ([c6cffc9](https://github.com/samtun/hackworld/commit/c6cffc99490a057c347b18cf5a23adef13d7aca9))

## [1.55.1](https://github.com/samtun/hackworld/compare/v1.55.0...v1.55.1) (2026-03-25)


### Bug Fixes

* improve trader UI UX with remembered selection, fixed titles, and auto-height details panel ([fb56586](https://github.com/samtun/hackworld/commit/fb5658640e69b4391e12f298c2a37ff29ed0414e))
* move item details panel to 3-column layout with mobile responsive fallback ([9011808](https://github.com/samtun/hackworld/commit/901180841a847691a61c68e6c13ac120d662856f))

# [1.55.0](https://github.com/samtun/hackworld/compare/v1.54.0...v1.55.0) (2026-03-20)


### Features

* let enemies rotate towards the player while attacking ([815ff14](https://github.com/samtun/hackworld/commit/815ff149285b9345a0ab7bd67c04850bdbf647ed))

# [1.54.0](https://github.com/samtun/hackworld/compare/v1.53.0...v1.54.0) (2026-03-20)


### Features

* add complete album control to DebugValueEditor ([7d22310](https://github.com/samtun/hackworld/commit/7d22310700d3d16d5eb3fc0aad3b2d3472108a84))
* add unlockable bonuses for booster pack card collections ([31a830c](https://github.com/samtun/hackworld/commit/31a830c6822dc69ca68b17f7b913115a23f9e860))
* rework reward descriptions ([cf414ce](https://github.com/samtun/hackworld/commit/cf414ceb0cd8d595bd92accf1164a7454f177d61))

# [1.53.0](https://github.com/samtun/hackworld/compare/v1.52.1...v1.53.0) (2026-03-17)


### Bug Fixes

* enemy return to base logic ([26f7358](https://github.com/samtun/hackworld/commit/26f7358c946b0cdfb14c33c3ff4c057e6cff9455))
* fix block chance formula and add blocking tests ([4ee3264](https://github.com/samtun/hackworld/commit/4ee3264832b219472330678ec93699ba9738c743))
* make block last for stun and block time ([32898d6](https://github.com/samtun/hackworld/commit/32898d6448f9144a1993826012f4bba4cb222795))
* player tests code ([248a8d7](https://github.com/samtun/hackworld/commit/248a8d7cab696202cb90deb3add8bec680ce7925))
* prevent movement/attack/jump animations from overriding block idle pose ([2d33ef5](https://github.com/samtun/hackworld/commit/2d33ef508b862ba234ce44c082da348fa2bf286c))
* prevent player from blocking while attacking or airborne ([da3a498](https://github.com/samtun/hackworld/commit/da3a498fc803511b4e75e9d8257fa070a85cb58c))
* replace THREE.Vector3Like with inline type in BlockShield ([9ead61e](https://github.com/samtun/hackworld/commit/9ead61e41a92a9e2d45cc6b570641edc63afbcfa))


### Features

* add blocking mechanic for player and enemies ([fe964ed](https://github.com/samtun/hackworld/commit/fe964ed4b004eafa8686fd0b5905d05e5a7d43d3))
* lower enemy block chance from 0.3 to 0.2 ([c8d925d](https://github.com/samtun/hackworld/commit/c8d925da550b13a65ead6d930e0fdff665b4890f))
* retain knockback of attack even when blocking ([d6992ba](https://github.com/samtun/hackworld/commit/d6992babd6dcc82b6dc4d203f0882e8d54a4dbec))
* stop enemies from updating while a menu is open ([08bf63b](https://github.com/samtun/hackworld/commit/08bf63b4911adc9fee282ccd5281b392355b3294))

## [1.52.1](https://github.com/samtun/hackworld/compare/v1.52.0...v1.52.1) (2026-03-07)


### Bug Fixes

* resolve TypeScript compilation errors in test files ([e2cff6d](https://github.com/samtun/hackworld/commit/e2cff6daa35b07f7da4b0ddaf75240ee98bc6590))

# [1.52.0](https://github.com/samtun/hackworld/compare/v1.51.0...v1.52.0) (2026-02-28)


### Bug Fixes

* allow dev-only stages to appear in dungeon selection in DEV mode ([7d5281a](https://github.com/samtun/hackworld/commit/7d5281a0591b47f1bc3e339aa2f04f5dc1f9028f))


### Features

* replace stageIndex with requiredProgress in stage metadata ([9f3ed3b](https://github.com/samtun/hackworld/commit/9f3ed3b66668a2418d35d74a8818411103e56a83))
* update dungeon selection UI with connection status message and animation ([77f454d](https://github.com/samtun/hackworld/commit/77f454d3b35461170bacd6f01acd5a9de552d284))

# [1.51.0](https://github.com/samtun/hackworld/compare/v1.50.2...v1.51.0) (2026-02-28)


### Features

* add warning when loading incompatible save game version ([bfed1e6](https://github.com/samtun/hackworld/commit/bfed1e67bcfa050cf01a0cdc227d7f5db8d3ffd3))

## [1.50.2](https://github.com/samtun/hackworld/compare/v1.50.1...v1.50.2) (2026-02-27)


### Bug Fixes

* make item names appear a bit darker ([e6618bf](https://github.com/samtun/hackworld/commit/e6618bf3a91239479e093769312e03dd753a7a64))
* pass damageFactor instead of bonusMultiplier to WeaponDrop to fix tier mismatch ([be8bb82](https://github.com/samtun/hackworld/commit/be8bb82e94ed8af401892e260deaf2ffc6013d88))

## [1.50.1](https://github.com/samtun/hackworld/compare/v1.50.0...v1.50.1) (2026-02-27)


### Bug Fixes

* update weapon drop instantiation for visual testing in MovementTest ([d5d327e](https://github.com/samtun/hackworld/commit/d5d327e861722fefb36f96c683402d0f23e6b0f2))

# [1.50.0](https://github.com/samtun/hackworld/compare/v1.49.0...v1.50.0) (2026-02-27)


### Bug Fixes

* update tier colors for better visibility and consistency in ItemDisplay and TierManager ([ff4061a](https://github.com/samtun/hackworld/commit/ff4061a212229a40c5eb1bfd33a76b73ed6e90c5))


### Features

* add test weapon drops for visual testing in MovementTest stage ([664676b](https://github.com/samtun/hackworld/commit/664676b52cbf37a04ec68b3ebe19c6eb9c68eccd))

# [1.49.0](https://github.com/samtun/hackworld/compare/v1.48.0...v1.49.0) (2026-02-27)


### Bug Fixes

* further revise SVG icons per second round of review feedback ([e6d1422](https://github.com/samtun/hackworld/commit/e6d1422c6bb94a7e3c307105a40ca4a422dec4d4))
* revise SVG icons per review feedback ([b2e2642](https://github.com/samtun/hackworld/commit/b2e2642a15646e0730140a3d4aec79d12f42062c))
* set default maxWidth and maxHeight for menu overlay ([1b7bd39](https://github.com/samtun/hackworld/commit/1b7bd392b1820e0e6fbb5240671aeab3d982287b))
* use single icon for all cores and single icon for all chips ([72762ba](https://github.com/samtun/hackworld/commit/72762bab7b038c7a8bd4abd5a5f9462695d93085))


### Features

* add core/chip icons and load all icons from SVG files ([f4875bd](https://github.com/samtun/hackworld/commit/f4875bd879067032ac563477ee899a6e84bf2139))
* add icons for stats, tech, and weapon items ([4bb0f81](https://github.com/samtun/hackworld/commit/4bb0f814be92a0f8be8f1607979802981a5085bd))
* add icons to stats and tech display in InventoryManager ([608007a](https://github.com/samtun/hackworld/commit/608007a800e8b9ce972bfaef9f4d6a54683a8456))

# [1.48.0](https://github.com/samtun/hackworld/compare/v1.47.0...v1.48.0) (2026-02-26)


### Bug Fixes

* leet tier laser beam directions ([bf3d63a](https://github.com/samtun/hackworld/commit/bf3d63a5bb4737423622a73a05ac3a00fbbed220))
* make each laser beam hit independently ([59692ff](https://github.com/samtun/hackworld/commit/59692ff6f53592d61f34b372b02bdefdaeff230e))


### Features

* add skill tech points and tier-based skill scaling ([5ee754d](https://github.com/samtun/hackworld/commit/5ee754da9978e941767dd51df032123dad527534))
* make heal skill recovery execute each second ([7b37566](https://github.com/samtun/hackworld/commit/7b375661405b98c0fccc05ebedc40751d923365a))
* scale skill TP cost per tier (×1/2/3/5/8 for Stable/Maintained/Overclocked/ZeroDay/Leet) ([d37d43f](https://github.com/samtun/hackworld/commit/d37d43fae8bcfcd7ff5e4d5a4d69a5e084749818))

# [1.47.0](https://github.com/samtun/hackworld/compare/v1.46.0...v1.47.0) (2026-02-25)


### Features

* add heal floating number ([3706e40](https://github.com/samtun/hackworld/commit/3706e40e3f8217a8894a9ab6b0bae26249de4fc7))

# [1.46.0](https://github.com/samtun/hackworld/compare/v1.45.0...v1.46.0) (2026-02-25)


### Bug Fixes

* fix broken tier item color in menus ([927d1ed](https://github.com/samtun/hackworld/commit/927d1ed866ad9aa38496333a1c475bea863a4e27))


### Features

* add color coding for weapon drops based on damage bonus tier ([d9bbef6](https://github.com/samtun/hackworld/commit/d9bbef6ed4e8754b857decbdfe8b14a7313e1de3))
* enhance weapon drop strategy and trader inventory with tier-based logic and sorting ([51583bc](https://github.com/samtun/hackworld/commit/51583bc0c7a141929e811ab6ad055b7710690628))
* implement weapon drop bonus scaling based on player level and update weapon tier colors ([2a5d671](https://github.com/samtun/hackworld/commit/2a5d671709863cb0fc7af81f2a1ab5d4aed71374))
* introduce colors to item displays and show tier in weapon details ([9eac95e](https://github.com/samtun/hackworld/commit/9eac95e959a79a28eba91a473a9d0298ae48dfe2))
* limit highest weapon tiers to higher levels ([702be5d](https://github.com/samtun/hackworld/commit/702be5d0fda1fc2d74924afe71d14e3b4dad6e16))
* overhaul WeaponTrader inventory with player-tech level and tier randomization ([11ae8ec](https://github.com/samtun/hackworld/commit/11ae8ec8eaa156714da78cc73ef1f59ec5885494))
* propagate weapon drop tier color to WeaponItem and inventory/trader UI ([4dec197](https://github.com/samtun/hackworld/commit/4dec197fbe0c6f8eb20465e102d7169800854bb3))
* rename best weapon tiers ([5f50332](https://github.com/samtun/hackworld/commit/5f50332752d9f5526421d6124443c489c03a497f))
* slightly tweak trader weapon spawn rates ([79c4543](https://github.com/samtun/hackworld/commit/79c4543449e2358c33961aca8f0e82d412c38e08))

# [1.45.0](https://github.com/samtun/hackworld/compare/v1.44.0...v1.45.0) (2026-02-25)


### Bug Fixes

* debounce confirm key on start menu and add logo fade + backdrop ([7cb4b55](https://github.com/samtun/hackworld/commit/7cb4b552b9463838163a3f70caace90833d9d7ab))
* fade out current slide before advancing on click ([174bf7a](https://github.com/samtun/hackworld/commit/174bf7afc33ee353355edb6c836df616bcea464e))
* freeze image scale before fade-out on click advance ([7d46845](https://github.com/samtun/hackworld/commit/7d468459590f95284d9b82371bd5eca519c2b5a8))
* lore image paths ([d14ce6d](https://github.com/samtun/hackworld/commit/d14ce6dfadea1f4047f1298365fd268cf6983c24))
* remove development environment check for start menu transition ([206312b](https://github.com/samtun/hackworld/commit/206312b2802307a5a3a7b2a8d46f8f466e82882b))
* start screen visibility changes after loading ([3d0b812](https://github.com/samtun/hackworld/commit/3d0b812667a718b2857326a4f27b5964b8cb52e5))


### Features

* add hold-to-skip-all with progress ring and seen flag ([eaddf14](https://github.com/samtun/hackworld/commit/eaddf14becf35e64462229dfea9e53dfd15d67b6))
* add lore introduction slideshow after start screen ([074464a](https://github.com/samtun/hackworld/commit/074464a531d5a1a83d5689e52fe5ee69f47196c9))
* add start menu with Continue/New Game/Load Game options ([273662e](https://github.com/samtun/hackworld/commit/273662e2b092a5ed86e8bc06e188e855a92e9d77))
* advance lore slide on click or tap ([56bbd50](https://github.com/samtun/hackworld/commit/56bbd50f2fdc6ebfbee894c00542efa98ef64c31))
* reduce fade out speed when skipping slide ([6037a52](https://github.com/samtun/hackworld/commit/6037a52397f76e1b9b8349bce8a72137c056e216))

# [1.44.0](https://github.com/samtun/hackworld/compare/v1.43.2...v1.44.0) (2026-02-24)


### Features

* add critical hits to enemy attacks ([ba55632](https://github.com/samtun/hackworld/commit/ba55632ae7e297fea3bf737c493fd0a58ea93998))
* use different color for critical hits ([275641f](https://github.com/samtun/hackworld/commit/275641f4037baa609d44a370238474fa302b4031))

## [1.43.2](https://github.com/samtun/hackworld/compare/v1.43.1...v1.43.2) (2026-02-20)


### Bug Fixes

* fix boss health bar and add new font ([8b14a20](https://github.com/samtun/hackworld/commit/8b14a208d08499c7446960b49d0b13f11be47670))
* item handling in save games ([4f0a6fc](https://github.com/samtun/hackworld/commit/4f0a6fcb75767ea6ad5fc2aed9963169f0ad735c))

## [1.43.1](https://github.com/samtun/hackworld/compare/v1.43.0...v1.43.1) (2026-02-20)


### Bug Fixes

* enemy start hp ([2f0c4f3](https://github.com/samtun/hackworld/commit/2f0c4f3700b56ad9449bee5b37b4887cc1cb7e08))
* weapon bonus calculation ([6913dce](https://github.com/samtun/hackworld/commit/6913dce2f38487fb88ab09bea997d2064379ca32))

# [1.43.0](https://github.com/samtun/hackworld/compare/v1.42.1...v1.43.0) (2026-02-20)


### Bug Fixes

* boss health bar visibility and weapon drop damage bonus ([6c90f80](https://github.com/samtun/hackworld/commit/6c90f80e9e0f5365c186d5281b92ac23a4a2a662))
* build error fix ([cdcef6c](https://github.com/samtun/hackworld/commit/cdcef6cf2134bfb9f6f4925a2a7c22c7e4b5aa0b))


### Features

* add boss enemy and refine item drops ([5aa3f5d](https://github.com/samtun/hackworld/commit/5aa3f5d4e0b4e1bf618902aad9f9b38976ae5372))

## [1.42.1](https://github.com/samtun/hackworld/compare/v1.42.0...v1.42.1) (2026-02-20)


### Bug Fixes

* node vulnerabilities ([bbb1910](https://github.com/samtun/hackworld/commit/bbb1910ef8e134a5aa7dbf7fca2dadd032dbe254))

# [1.42.0](https://github.com/samtun/hackworld/compare/v1.41.0...v1.42.0) (2026-02-18)


### Bug Fixes

* exp amount displayed on enemy defeat ([2c88351](https://github.com/samtun/hackworld/commit/2c88351df38f011e69c5aef668ea7229378f9a84))
* exp gain calculation ([2d45d85](https://github.com/samtun/hackworld/commit/2d45d85c467a2d291b08f6d2309aea53029d8000))
* log usages and exp luck bonus calculation ([3b04f3b](https://github.com/samtun/hackworld/commit/3b04f3b45f6756d552903b3cbc6dcca978a19895))
* revert enemy item drop chance to 4 percent ([2b33ff1](https://github.com/samtun/hackworld/commit/2b33ff14901e4a20151d91afa599e1c5d306a6f1))


### Features

* add coin model to model drop ([cff8d0b](https://github.com/samtun/hackworld/commit/cff8d0b42638277a7a9b193321e4382b48a71cf7))
* add floating indicators for bits and xdata drops ([aab0232](https://github.com/samtun/hackworld/commit/aab0232a8d27a1033c133db0baf022de79da5c87))
* add models to all item drops ([a3b8f34](https://github.com/samtun/hackworld/commit/a3b8f34750e61478206f4f8cad1d4e98e82ee4e6))
* add money drop ([b8c5a46](https://github.com/samtun/hackworld/commit/b8c5a46b91c397107bdbdc5fa521115911fd76dc))
* add support for draco compressed glb files ([7c909b9](https://github.com/samtun/hackworld/commit/7c909b9e47a9e1608225049adfe8051e6927bc1d))
* improve chrit and exp bonus calculations ([42c4400](https://github.com/samtun/hackworld/commit/42c4400a2466921fb900f0efb07a7f118f41086b))

# [1.41.0](https://github.com/samtun/hackworld/compare/v1.40.0...v1.41.0) (2026-02-15)


### Features

* add skill indicators ([e3d8eb0](https://github.com/samtun/hackworld/commit/e3d8eb0fa9d02577c7c2e75fcc7e11459cac6f18))

# [1.40.0](https://github.com/samtun/hackworld/compare/v1.39.0...v1.40.0) (2026-02-15)


### Features

* take improvements form work on rapier physics tryout ([29c5734](https://github.com/samtun/hackworld/commit/29c5734d1a81f565704d6751d6799ac38a233a38))

# [1.39.0](https://github.com/samtun/hackworld/compare/v1.38.0...v1.39.0) (2026-01-20)


### Bug Fixes

* add null checks for player before saving ([410d880](https://github.com/samtun/hackworld/commit/410d8804abaef99053013f481ddf0aee162f79d9))
* prevent auto-save during reset operation ([9764c63](https://github.com/samtun/hackworld/commit/9764c638285f3e1dcf3cc61327eaeddd5a5f2f05))


### Features

* add fresh argument to avoid loading game state in dev builds ([cc98fe9](https://github.com/samtun/hackworld/commit/cc98fe904541053a0a08f57e2f09a38889be9ed2))
* add localStorage auto-save functionality ([46f1c03](https://github.com/samtun/hackworld/commit/46f1c03e36bac78bd632343161337829efb87aea))
* use project version in save file, remove mobile url switch ([56da16e](https://github.com/samtun/hackworld/commit/56da16ebc66ef57083454bde3e20bba9696e3b7a))

# [1.38.0](https://github.com/samtun/hackworld/compare/v1.37.1...v1.38.0) (2026-01-19)


### Bug Fixes

* fix mobile button styles ([26792d7](https://github.com/samtun/hackworld/commit/26792d73eee4470deca02458b3a3a7513f4ec803))
* fix player spawn location and body sync position ([038e767](https://github.com/samtun/hackworld/commit/038e76750db1335bcb03e14ee752ac57426f0414))
* menu bottom margin ([079a88a](https://github.com/samtun/hackworld/commit/079a88acbda23eb361c174775b7d9b7a3979e260))


### Features

* add MenuManager and centralized control hints system ([d384dab](https://github.com/samtun/hackworld/commit/d384dab3906ee5dce6eeb96187474f3283f8f874))

## [1.37.1](https://github.com/samtun/hackworld/compare/v1.37.0...v1.37.1) (2026-01-19)


### Bug Fixes

* dash movement, animation, and knockback issues ([9534685](https://github.com/samtun/hackworld/commit/9534685e1e6f52fae551651265dafd88c4bf4540))
* fix player knockback behavior ([ac3faea](https://github.com/samtun/hackworld/commit/ac3faeaa58f126d9b5d48006dd22a7d1163ce08b))

# [1.37.0](https://github.com/samtun/hackworld/compare/v1.36.0...v1.37.0) (2026-01-19)


### Bug Fixes

* fix skill handling order and tp cost ([6e7f2a0](https://github.com/samtun/hackworld/commit/6e7f2a004660c6d5fe37d7299d94510925cd4bec))
* improve skill implementation based on code review ([7a47f8a](https://github.com/samtun/hackworld/commit/7a47f8a342f19db4e28fbc311dd4e25924e4cb0c))
* remove jump when executing skill ([6a1117e](https://github.com/samtun/hackworld/commit/6a1117e6f2e289583621a663d24a82b932036c98))
* reposition skills button and hide when menus are open ([85de664](https://github.com/samtun/hackworld/commit/85de664164b8eb56bec37d8cf9148f6fd885b5c9))


### Features

* (WIP) add heal fx model ([52c9d44](https://github.com/samtun/hackworld/commit/52c9d441c59b3c6b5ee9baba4cd95d7e1fbbac10))
* add character profile image ([5261e0a](https://github.com/samtun/hackworld/commit/5261e0a2691bd740c8ce5219c06dd08e90014df7))
* add insufficient tp warning to skill use ([afb991a](https://github.com/samtun/hackworld/commit/afb991ac586dff157d1b0afb62ff4318d492a3e1))
* add mobile skill controls with toggle button ([7d9bc84](https://github.com/samtun/hackworld/commit/7d9bc84a3d61d0576b36d00477647dba7f049e28))
* add skill system with three active skills ([e2a561a](https://github.com/samtun/hackworld/commit/e2a561a404bab35c956d770eabccf4adcb2e4a35))
* improve area attack animation ([08863b7](https://github.com/samtun/hackworld/commit/08863b78b78a2e1e34bcc26f4b981a25348ba59f))
* improve heal skill particles ([b721cb1](https://github.com/samtun/hackworld/commit/b721cb1f0296a7f5b2c9570eb0e4d9e78ec90693))
* improve laser skill visual ([0ec07f6](https://github.com/samtun/hackworld/commit/0ec07f6b1e49097a2bf6c7e918e3485792cbb388))
* improve skill visuals further ([0e096e8](https://github.com/samtun/hackworld/commit/0e096e8053efd8af3dd12747da3269f17a2be8a7))
* improved healing skill visual ([07ce31f](https://github.com/samtun/hackworld/commit/07ce31fb9795ecf8d7836d660e872b3aa2c50f74))
* make teleporter only interactible at front and keep updating game during menu ([ff88977](https://github.com/samtun/hackworld/commit/ff88977e1e7f4c4d01a3573b650d1452769e57d1))
* new teleporter visual ([ef91a72](https://github.com/samtun/hackworld/commit/ef91a72ecf9a486ee6587abeaec675575a815a16))
* use icons for skills on mobile, add mainframe model ([83c87b2](https://github.com/samtun/hackworld/commit/83c87b2f8a7ec3133bb2dda33d712c7b6f2bb68f))

# [1.36.0](https://github.com/samtun/hackworld/compare/v1.35.0...v1.36.0) (2026-01-16)


### Bug Fixes

* add explicit return type annotations to getMetadata methods ([84347e0](https://github.com/samtun/hackworld/commit/84347e09b2295d56eeb919f42383bdae1939246c))
* add missing commas in metadata return statements ([fbba193](https://github.com/samtun/hackworld/commit/fbba193bbffccfc02b77faa856cdde98164c8e6b))
* base stage implementation ([cc6b937](https://github.com/samtun/hackworld/commit/cc6b937bda25a1e3e8332c7d3a4839a1c3e69f70))
* make mainframe dialogue always show ([4cb3ca9](https://github.com/samtun/hackworld/commit/4cb3ca9a844c4efec5a30e6a846432cfed51fb2d))
* movement test stage not showing up in dungeon selection ([460b56c](https://github.com/samtun/hackworld/commit/460b56c1628d7074cb55b0d3c22cfea4e416f297))
* use stageIndex metadata instead of array position for unlocking ([0097ca2](https://github.com/samtun/hackworld/commit/0097ca274ec8f78685218200a22896d7b7fe72e3))


### Features

* add mainframe NPC and quest progression system ([51e2874](https://github.com/samtun/hackworld/commit/51e2874f3be0a1b91b7ebe8b9ab59c6bd0b71665))

# [1.35.0](https://github.com/samtun/hackworld/compare/v1.34.0...v1.35.0) (2026-01-15)


### Bug Fixes

* clamp normal.y to prevent Math.acos errors ([560d938](https://github.com/samtun/hackworld/commit/560d938f8a2c0363764d19690ff5a3f462e152d7))
* player collider setup ([f75806b](https://github.com/samtun/hackworld/commit/f75806b67323aa5fdfa9068aba8aafeacc2cc5dd))
* prevent player sliding on minor slopes by adding friction ([381d0a9](https://github.com/samtun/hackworld/commit/381d0a9db9ad854cc4978ef4a95378adc62ca832))
* restore player movement by detecting slopes instead of using friction ([c129ea7](https://github.com/samtun/hackworld/commit/c129ea7f102519815a3d3e6e58d1a5a27a79d963))
* stage map initialization ([b38b2a8](https://github.com/samtun/hackworld/commit/b38b2a801cb215aef6414657d5697fd313c9ba20))


### Features

* add movement test stage ([daac864](https://github.com/samtun/hackworld/commit/daac8644cd9abb2f002817f13a673494e164ea70))

# [1.34.0](https://github.com/samtun/hackworld/compare/v1.33.0...v1.34.0) (2026-01-14)


### Features

* add xdata terminal model ([96148d1](https://github.com/samtun/hackworld/commit/96148d1471bcd91565b0a41a6c5d761590509b40))
* split materials on xdata terminal ([dbf86ca](https://github.com/samtun/hackworld/commit/dbf86ca0457888ffef44a254fc87a9711ff79e61))

# [1.33.0](https://github.com/samtun/hackworld/compare/v1.32.0...v1.33.0) (2026-01-14)


### Bug Fixes

* disable screen-wide interaction when menus are open ([874b3e9](https://github.com/samtun/hackworld/commit/874b3e9b6bd72ff6ca77a1dbee96a0c150411bbc))
* fix mobile controls ([864566e](https://github.com/samtun/hackworld/commit/864566e9f5d08f6c528ff99d9ebe9c2870fb5eb1))
* fix start screen continuation on mobile ([68481f4](https://github.com/samtun/hackworld/commit/68481f42111b96303e20b0781e980e215ba79700))


### Features

* add close button and improve start screen touch ([f9b7c0a](https://github.com/samtun/hackworld/commit/f9b7c0a9c70c71d43d8b1ab284a7ef3d94375c5e))
* add mobile touch controls with virtual joystick ([d811a02](https://github.com/samtun/hackworld/commit/d811a024b939dbf6c691a12259860f007b9dfc16))

# [1.32.0](https://github.com/samtun/hackworld/compare/v1.31.0...v1.32.0) (2026-01-14)


### Bug Fixes

* move down enemy spawn positions ([977c562](https://github.com/samtun/hackworld/commit/977c562d50491baa9f071da47547a2d8df5e9902))


### Features

* add base position return behavior to enemies ([74b8ec3](https://github.com/samtun/hackworld/commit/74b8ec3476d0ab8b996d8243e19daee1b297dd5b))

# [1.31.0](https://github.com/samtun/hackworld/compare/v1.30.0...v1.31.0) (2026-01-14)


### Features

* add grid to base of world ([50ea737](https://github.com/samtun/hackworld/commit/50ea7374f95179c590f2597e791fa6172e99c83f))
* improve grid shader ([acaa5d0](https://github.com/samtun/hackworld/commit/acaa5d0b5768a44d416c0a0c4eff819da9a7cc35))
* improve grid shader further ([003e02f](https://github.com/samtun/hackworld/commit/003e02f0a9adb2f7f0f619f233e55e8b9edbce61))

# [1.30.0](https://github.com/samtun/hackworld/compare/v1.29.0...v1.30.0) (2026-01-14)


### Bug Fixes

* enemy attack and death ([d029898](https://github.com/samtun/hackworld/commit/d02989827842a466b76295ee0bdb810ba44810b7))


### Features

* add monster model with animations ([7560447](https://github.com/samtun/hackworld/commit/7560447979e66612a573b36713f541dc2f76a998))
* make attack animation faster ([e9ec633](https://github.com/samtun/hackworld/commit/e9ec633264146fa1c535102ce362d89602e3817d))

# [1.29.0](https://github.com/samtun/hackworld/compare/v1.28.1...v1.29.0) (2026-01-14)


### Bug Fixes

* enemy mesh position and hit detection ([b8e03ab](https://github.com/samtun/hackworld/commit/b8e03abd6120e7ed89658683600743727735cec2))
* fix attack animations ([5b2df54](https://github.com/samtun/hackworld/commit/5b2df54da81f8ceefb3eeb291c800466ce6b9b63))
* fix build errors ([8ce0d92](https://github.com/samtun/hackworld/commit/8ce0d924acf4de3dd0a462b9b6a8696b0f9e87a4))
* fix collision checks with player and attack hitboxes ([b58694c](https://github.com/samtun/hackworld/commit/b58694cdda90597b2a6f9f1f32bdd12597b16cc2))
* fix weapon attack collider check ([c7b1180](https://github.com/samtun/hackworld/commit/c7b1180434a0d847496c03747f4fe0124f095ca0))
* gravity ([3e81d31](https://github.com/samtun/hackworld/commit/3e81d314225831529e61b4fad0c001b644d53580))
* remove unused enemies from player update call ([86020f8](https://github.com/samtun/hackworld/commit/86020f8a5e7aad6f5c0b2fc590851e09f43242b6))


### Features

* add first animations to player character ([005da46](https://github.com/samtun/hackworld/commit/005da466b623dcf0d84f14ad4b1906738a0b82e5))
* add further player animations ([336b3cf](https://github.com/samtun/hackworld/commit/336b3cfd46a768ed96c3ff1c6c5a404cd747e26a))
* add level up shockwave ([ea7e555](https://github.com/samtun/hackworld/commit/ea7e5556a7a60f9926420172e29ae63cedfc7eb3))
* add power up animation to player model ([c21cd78](https://github.com/samtun/hackworld/commit/c21cd78fdb87c88fb0d68bc088667b27d7fb35ae))
* add show colliders button to DebugValueEditor ([12e0581](https://github.com/samtun/hackworld/commit/12e0581545b530a7155a85f02b6f22dadea920c1))
* use actual weapon colliders from attacks ([a902f97](https://github.com/samtun/hackworld/commit/a902f97daee798bba09524638b3ac18616e8e56b))

## [1.28.1](https://github.com/samtun/hackworld/compare/v1.28.0...v1.28.1) (2026-01-09)


### Bug Fixes

* fix enemy flashing on hit and adjust constants ([0bfd809](https://github.com/samtun/hackworld/commit/0bfd8096a30eda4625e0a548f671f4ef1c09a731))
* fix jumping of player ([d2dee99](https://github.com/samtun/hackworld/commit/d2dee9901f17a85f1776d042075de17f2c1c3a50))

# [1.28.0](https://github.com/samtun/hackworld/compare/v1.27.0...v1.28.0) (2026-01-09)


### Features

* add player and enemy models ([c0e7b20](https://github.com/samtun/hackworld/commit/c0e7b20bf1d5c1de60b3bbe853a75ebd39706aa6))

# [1.27.0](https://github.com/samtun/hackworld/compare/v1.26.0...v1.27.0) (2026-01-09)


### Features

* move initial player position to stages ([f7862b5](https://github.com/samtun/hackworld/commit/f7862b5f33216ff5e2d9c2dc701769cd9d08c421))

# [1.26.0](https://github.com/samtun/hackworld/compare/v1.25.0...v1.26.0) (2026-01-09)


### Bug Fixes

* await load call on stages ([70b4fb5](https://github.com/samtun/hackworld/commit/70b4fb59be6c5dbdb2f2ec3c8ec42b11d0e2d976))


### Features

* add animated banner to lobby mesh ([bec3b00](https://github.com/samtun/hackworld/commit/bec3b00fdf56ff640f0d21c5948b20b7da245390))
* add env map to all stages ([5183379](https://github.com/samtun/hackworld/commit/5183379c961623d172ac1542234f3904bc392d54))
* add lobby geometry with collider ([6570e63](https://github.com/samtun/hackworld/commit/6570e6310a380ffca4722333c777a5ee23c581fa))
* add lobby model ([33321c6](https://github.com/samtun/hackworld/commit/33321c64c0210d2c9ade997a6684941b751248a7))
* add vertical fadeout to lobby mesh ([b7a4eca](https://github.com/samtun/hackworld/commit/b7a4ecaded3d160b44433f75ed36b8d9a328c3d4))

# [1.25.0](https://github.com/samtun/hackworld/compare/v1.24.2...v1.25.0) (2026-01-06)


### Features

* add dialogue on first NPC interaction before showing UIs ([78d2a4f](https://github.com/samtun/hackworld/commit/78d2a4fccd4074c46508d207c6b561d016de61d3))

## [1.24.2](https://github.com/samtun/hackworld/compare/v1.24.1...v1.24.2) (2026-01-06)


### Bug Fixes

* prevent rapid button switching in Save Manager UI ([0db7d83](https://github.com/samtun/hackworld/commit/0db7d83facb95d0815e2251e1750820fbfab2c29))

## [1.24.1](https://github.com/samtun/hackworld/compare/v1.24.0...v1.24.1) (2026-01-06)


### Bug Fixes

* display agility and luck stats correctly in XData upgrade UI ([e6dd004](https://github.com/samtun/hackworld/commit/e6dd004f2be4d58e2ad9e24e9904b1f53edda396))

# [1.24.0](https://github.com/samtun/hackworld/compare/v1.23.0...v1.24.0) (2026-01-06)


### Bug Fixes

* npc dialogue shows correct hints on first open and card pack hints render as html ([d030a2d](https://github.com/samtun/hackworld/commit/d030a2d44abaeb04541d77c1c873213256465966))


### Features

* add dynamic hints to SaveManagerUI ([e20d7fc](https://github.com/samtun/hackworld/commit/e20d7fc521081cece425df9abd7dffd6ca9f1891))
* add dynamic input hints based on controller connection ([8089480](https://github.com/samtun/hackworld/commit/80894807edd5edec773af2f43d176eee65d1dd8d))
* complete dynamic hints implementation for CardManager ([05a22af](https://github.com/samtun/hackworld/commit/05a22af9c33532e12605b43341e49659b74ae3e9))

# [1.23.0](https://github.com/samtun/hackworld/compare/v1.22.0...v1.23.0) (2026-01-05)


### Bug Fixes

* remove stat level multiplier ([18ab267](https://github.com/samtun/hackworld/commit/18ab2678323ff8342ac04ae9dc06a901e3cd3fbf))
* separate stat points from XData upgrades for independent tracking ([da2cd61](https://github.com/samtun/hackworld/commit/da2cd61bbf4c15aa8913c89383c128899c50c8e2))


### Features

* add Agility and Luck to X-Data upgrade UI ([f968157](https://github.com/samtun/hackworld/commit/f968157eca1f94953d395344564c911edbadefc4))
* apply luck multiplier to item drops and EXP gains ([e0fb658](https://github.com/samtun/hackworld/commit/e0fb6584956c09f6ae9bb905506972eef9f0d18a))
* implement player stat system with strength, defense, agility, and luck ([19a6ef8](https://github.com/samtun/hackworld/commit/19a6ef80bb6de9852b4652a8df0f86ea67ec4732))
* improve stat points display and add level up button to debug panel ([2650c10](https://github.com/samtun/hackworld/commit/2650c1002c390c7a1668140735b208e8248cb8b4))

# [1.22.0](https://github.com/samtun/hackworld/compare/v1.21.2...v1.22.0) (2026-01-05)


### Bug Fixes

* apply progressive stat scaling to chips and cores JSON files ([7f166d9](https://github.com/samtun/hackworld/commit/7f166d974be7b80335cec19fe24a9344615a1e9d))
* clone methods now correctly use base prices and deep copy stats ([a04c4e4](https://github.com/samtun/hackworld/commit/a04c4e4e8a977a67a940f6945b523f36db57d187))
* remove drop managers and unify drops further ([6bc0f87](https://github.com/samtun/hackworld/commit/6bc0f874c28e5d700e203f6433e38478a9349c3d))
* remove level from itemdetailpanel ([940f129](https://github.com/samtun/hackworld/commit/940f129da182cccc7a54a63a517d5adc957d0197))
* remove redundant method from chip and core items ([843fbdf](https://github.com/samtun/hackworld/commit/843fbdf591643bd2f84a95c8dbaa4ec08558f730))
* revert DebugValueEditor changes ([4eaa777](https://github.com/samtun/hackworld/commit/4eaa7777184051e405f7f7dec23f12774eded49c))
* revert test change ([f134605](https://github.com/samtun/hackworld/commit/f13460576956d817a69bb20a9f4915ad3ff29ae1))


### Features

* add chip and core repositories with JSON data files ([f046d04](https://github.com/samtun/hackworld/commit/f046d04cca6c98fd35308e86bc1a36d9d33379b3))
* apply level-based price multipliers to chip and core sell prices ([b4b3191](https://github.com/samtun/hackworld/commit/b4b31919b7c2c1b49ce1b99e2a02170695d07ada))
* remove price from item name in inventory, move to item details ([27c408b](https://github.com/samtun/hackworld/commit/27c408b316843cf52fb66b85190e232bd19ca65c))

## [1.21.2](https://github.com/samtun/hackworld/compare/v1.21.1...v1.21.2) (2026-01-05)


### Bug Fixes

* revert changes in DebugValueEditor ([120bad5](https://github.com/samtun/hackworld/commit/120bad57cd25fb149731c2c4e23f6d980ed438b1))

## [1.21.1](https://github.com/samtun/hackworld/compare/v1.21.0...v1.21.1) (2026-01-05)


### Bug Fixes

* fix stats placement in DebugValueEditor ([2402e8f](https://github.com/samtun/hackworld/commit/2402e8f97a17dff72530a5d5e859c16c31619d77))
* remove duplicate defense field and fix money input key ([1760175](https://github.com/samtun/hackworld/commit/17601755dbd048c5d767f5c4f6c87a9905cfbe35))
* reorganize player stats layout to keep speed and money visible ([6449daa](https://github.com/samtun/hackworld/commit/6449daaabc16ac49143d6c9563e2cf6c869fd330))
* value editor layout ([2807a13](https://github.com/samtun/hackworld/commit/2807a13be6783ba3b7df36806c0296e57584e33a))

# [1.21.0](https://github.com/samtun/hackworld/compare/v1.20.0...v1.21.0) (2026-01-05)


### Bug Fixes

* automatically pickup xdata drop when near ([b79d8a9](https://github.com/samtun/hackworld/commit/b79d8a96c91fb8c82939acb8e766a43456cb6563))
* fix adding weapons via DebugValueEditor ([ed43b21](https://github.com/samtun/hackworld/commit/ed43b216c5544b34c8cf96f80bff7ec6790c5213))
* make xData only drop if no item was dropped ([96870cc](https://github.com/samtun/hackworld/commit/96870ccb343604b00c187937fd6cbf1a891e9e8c))
* remove unused import ([b3581af](https://github.com/samtun/hackworld/commit/b3581afa0b0ecb03edb30bbf34fcd07211e04124))


### Features

* unify item drops with consistent strategy pattern ([84ec3c1](https://github.com/samtun/hackworld/commit/84ec3c12a0859b2f1ef0df769f9c478bf857c93c))

# [1.20.0](https://github.com/samtun/hackworld/compare/v1.19.0...v1.20.0) (2026-01-05)


### Bug Fixes

* only clear itemElements array for active panel in BaseTrader ([c52aeb1](https://github.com/samtun/hackworld/commit/c52aeb1a56f9a45153b203ba7dd510d9a8f6f8e3))


### Features

* add shake and grayed out styling for unequippable items ([c689403](https://github.com/samtun/hackworld/commit/c6894038c38217ed83cf56f5ffb75f6706908d5c))

# [1.19.0](https://github.com/samtun/hackworld/compare/v1.18.0...v1.19.0) (2026-01-05)


### Bug Fixes

* add error handling and validation for load functionality ([03fcc6e](https://github.com/samtun/hackworld/commit/03fcc6e7901f4dcb380d50b768da1558ca347d98))
* restore HP/TP after stat recalculation in load ([77edc69](https://github.com/samtun/hackworld/commit/77edc699b89752623a1671cd103eb22f16f719fc))


### Features

* add load save file functionality to save manager ([f2a160a](https://github.com/samtun/hackworld/commit/f2a160ad497b33f86f5e32e3e05ed4f9b73ad1e1))

# [1.18.0](https://github.com/samtun/hackworld/compare/v1.17.0...v1.18.0) (2026-01-05)


### Bug Fixes

* correct comment for spawnEXP method ([175ab31](https://github.com/samtun/hackworld/commit/175ab3196233cd28e907260ae19ee04f40e64ab0))
* update comment to refer to indicators instead of numbers ([50bd58c](https://github.com/samtun/hackworld/commit/50bd58c640abe3a7f29d8d5ed8e1124bffffa9ca))


### Features

* reduce tech indicator size and time ([1c12f87](https://github.com/samtun/hackworld/commit/1c12f87071f742a46faa10a6d34af57c014edb4b))
* rename FloatingNumber to FloatingIndicator and add tech point indicator ([371cf14](https://github.com/samtun/hackworld/commit/371cf1459efde0909d749d6926113cb4c7c3b715))

# [1.17.0](https://github.com/samtun/hackworld/compare/v1.16.0...v1.17.0) (2026-01-05)


### Bug Fixes

* unify item drop label font styles for consistency ([e931717](https://github.com/samtun/hackworld/commit/e931717b44b0069c3fb7a002a2da0ee803a0b70f))


### Features

* unify BoosterPackDrop label with shared createTextLabel method ([210b0a7](https://github.com/samtun/hackworld/commit/210b0a7ac5b3a797a30317aaec381e6ed291f33a)), closes [#ffaa00](https://github.com/samtun/hackworld/issues/ffaa00)
* unify ItemDrop label styles with Share Tech font ([e6295e0](https://github.com/samtun/hackworld/commit/e6295e0d2abb4c5d90e27ee2e60ad5a32e89c1b8))

# [1.16.0](https://github.com/samtun/hackworld/compare/v1.15.0...v1.16.0) (2026-01-05)


### Bug Fixes

* fix hp and tp calculation on level up ([e94854c](https://github.com/samtun/hackworld/commit/e94854c6c38284b01be6fdd538f3bbe6ef513e33))
* use single random roll for proper 25% probabilities ([9abd1c5](https://github.com/samtun/hackworld/commit/9abd1c589411280db5b6bee3cf8a0e517c09bdc3))


### Features

* implement proper weapon drop logic based on player tech ([a6c68c7](https://github.com/samtun/hackworld/commit/a6c68c7cf647d8079363d11c862c5babff2b94f9))

# [1.15.0](https://github.com/samtun/hackworld/compare/v1.14.0...v1.15.0) (2026-01-04)


### Features

* add ESC/B button support to close inventory ([779478c](https://github.com/samtun/hackworld/commit/779478c86e6ef7580d8523859637adad6653fb84))

# [1.14.0](https://github.com/samtun/hackworld/compare/v1.13.0...v1.14.0) (2026-01-04)


### Features

* expand weapon registry with additional weapon entries and updated attributes ([1da75d7](https://github.com/samtun/hackworld/commit/1da75d748850543118e4b791ceac66b12b46f926))
* refactor weapon repository to load weapons from JSON data ([ffe408b](https://github.com/samtun/hackworld/commit/ffe408b5d1c564c7f8b7236456305a6fcde57693))

# [1.13.0](https://github.com/samtun/hackworld/compare/v1.12.0...v1.13.0) (2026-01-04)


### Bug Fixes

* add zero damage guard and fix weapon mutation in debug editor ([40f7caf](https://github.com/samtun/hackworld/commit/40f7caf690e6af041f9c0418739d0e3a5b55a22d))


### Features

* replace WeaponRegistry with WeaponRepository using tree structure ([b6650ab](https://github.com/samtun/hackworld/commit/b6650ab28300b79f26416de2086524a13c8fb0c4))

# [1.12.0](https://github.com/samtun/hackworld/compare/v1.11.0...v1.12.0) (2026-01-04)


### Bug Fixes

* improve floating number visibility ([cf3d6f0](https://github.com/samtun/hackworld/commit/cf3d6f0d84f5298b0a4e8b674a0c2cba2b922a76))
* remove duplicate expNumbers array reset ([c402379](https://github.com/samtun/hackworld/commit/c402379b538d56548487d47a796eccdce0238fc8))


### Features

* add damage numbers on hit for players and enemies ([3bf033f](https://github.com/samtun/hackworld/commit/3bf033f1ac530c64cbbe3170448fb4ff2fbbc119))
* add priority option for floating numbers to control render order ([b052675](https://github.com/samtun/hackworld/commit/b052675b40197f3784446d117c51ab5a6f926edf))
* make floating numbers hold at upmost top position ([19a93e2](https://github.com/samtun/hackworld/commit/19a93e2502f5c4cf43e1debea4c7536adc09e0b4))
* render floating numbers on top of all objects with depthTest false ([fa81210](https://github.com/samtun/hackworld/commit/fa81210fe7d0b3289cdddafdc1439f99e43dbe55))

# [1.11.0](https://github.com/samtun/hackworld/compare/v1.10.0...v1.11.0) (2026-01-03)


### Bug Fixes

* add WebKit prefix for backface-visibility to ensure flip animation works ([2c907bf](https://github.com/samtun/hackworld/commit/2c907bf7a6db42c47b2e4af207f46f1d1b83c811))
* address code review feedback ([d5dc8f0](https://github.com/samtun/hackworld/commit/d5dc8f0253c5e81ffa4481ad6d2bea89b602bca1))
* address PR review feedback ([ade09af](https://github.com/samtun/hackworld/commit/ade09afbe0299fd5154000fc49dfc4cb7bd4fbb4))
* card flip transition ([f08a148](https://github.com/samtun/hackworld/commit/f08a148176247447b0f7d118a44b38d8ba0d6628))
* invert new card status logic and improve layout for status display ([8662d61](https://github.com/samtun/hackworld/commit/8662d61877f99973bc9c6f11f6dbf71ce3707db6))
* use full card rarity in ui ([ad47701](https://github.com/samtun/hackworld/commit/ad47701540de0ecf14155bc90659fbb31c49cbcd))


### Features

* add card collectibles system with booster packs ([afef61a](https://github.com/samtun/hackworld/commit/afef61aeadd2b13db392ce4eba1b38b8eb629a52))
* add card flip animation with card backs to booster pack opening ([9112190](https://github.com/samtun/hackworld/commit/91121903cd5d7270bdb97cc7e3e40ae930f0a9ad))
* display all 5 cards at once when opening booster pack ([90bcfb9](https://github.com/samtun/hackworld/commit/90bcfb9cbd09be58d438e83357a88b108e2583d9))
* reduce booster pack to 4 cards and add 3D flip animation ([fafa64a](https://github.com/samtun/hackworld/commit/fafa64ae533d04951b3808fe6f13ce2ec5ba599e))

# [1.10.0](https://github.com/samtun/hackworld/compare/v1.9.1...v1.10.0) (2026-01-03)


### Features

* add weapon tech stats to inventory ([ae8e9dc](https://github.com/samtun/hackworld/commit/ae8e9dca95c23167bcaafe377fd60b15afa265fd))
* refactor inventory UI to enhance stats panel and remove equipped items slots ([25a9dda](https://github.com/samtun/hackworld/commit/25a9ddad88dcac9799c4b5773ea7c4f58dbfdd38))

## [1.9.1](https://github.com/samtun/hackworld/compare/v1.9.0...v1.9.1) (2026-01-03)


### Bug Fixes

* add safer validation in updateParticleScaleFactor ([2a8b80c](https://github.com/samtun/hackworld/commit/2a8b80c01f4b49c487ba136c427df35bd393168b))
* make particle sizes screen-size independent ([7c9a56b](https://github.com/samtun/hackworld/commit/7c9a56b0474091b6a2af14c34bc7b064c7a51bca))

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
