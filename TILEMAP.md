# Hướng dẫn Tiled Tilemap

## Cấu trúc thư mục assets

```
public/assets/
├── maps/
│   ├── world.json      ← file map Tiled (đã có)
│   └── tileset.tsj     ← tileset definition (đã có)
└── tilesets/
    └── farm_tiles.png  ← ảnh tileset (bạn cần cung cấp)
```

---

## Tileset Image (farm_tiles.png)

Ảnh phải có kích thước **128 × 64 px**, chia thành lưới **4 × 2** tile,
mỗi tile **32 × 32 px**:

```
┌────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │  ← hàng 1
│grass│farm│path│tree│
├────┼────┼────┼────┤
│ 5  │ 6  │ 7  │ 8  │  ← hàng 2
│water│wall│    │    │
└────┴────┴────┴────┘
```

| ID (Tiled) | Tile      | Ghi chú                          |
|-----------|-----------|----------------------------------|
| 1         | Grass     | Cỏ xanh                          |
| 2         | Farmland  | Đất nông trại (màu nâu)          |
| 3         | Path      | Đường mòn                        |
| 4         | Tree      | Cây trang trí                    |
| 5         | Water     | Nước (xanh dương)                |
| 6         | Wall      | Tường / viền bản đồ (có collision)|

> **Mẹo**: Bạn có thể dùng [Kenney.nl](https://kenney.nl/assets/tiny-town)
> (miễn phí, CC0) để lấy tileset 32×32 sẵn có, sau đó ghép lại bằng
> Photoshop / GIMP theo thứ tự trên.

---

## Chạy game hiện tại (chưa có tileset)

Game đã có **fallback tự động** — nếu `farm_tiles.png` chưa có,
`TilemapLoader` sẽ tự vẽ màu placeholder giống hệt bản cũ.
Không cần làm gì thêm, chạy `npm run dev` là được.

---

## Chỉnh sửa map bằng Tiled

1. Tải [Tiled Map Editor](https://www.mapeditor.org/) (miễn phí)
2. Mở `public/assets/maps/world.json`
3. Thêm tileset: **Map → Add External Tileset** → chọn `tileset.tsj`
4. Vẽ lại Ground / Decoration / Collision layer tuỳ ý
5. Export lại dưới dạng JSON (giữ nguyên tên file)

### Quy tắc layer

| Layer       | Mục đích                                    |
|-------------|---------------------------------------------|
| Ground      | Nền đất (grass, farmland, water, path)      |
| Decoration  | Cây cối, đá, trang trí (không collision)    |
| Collision   | Tile vô hình, chặn player đi qua            |
| Zone        | Object layer — định nghĩa vùng tương tác    |

### Zone objects (Object layer "Zone")

Mỗi zone là một rectangle với custom property:

| Property | Type   | Value    | Ý nghĩa              |
|----------|--------|----------|----------------------|
| zone     | string | `farm`   | Vùng trồng trọt      |
| zone     | string | `water`  | Vùng câu cá          |
| zone     | string | `path`   | Đường đi             |
| zone     | string | `grass`  | Cỏ thông thường      |

---

## Thêm map mới

```ts
// src/constants/index.ts
export const MapKey = {
  World:  'world',
  Town:   'town',   // ← thêm
} as const;

// PreloadScene.ts
scene.load.tilemapTiledJSON(MapKey.Town, 'assets/maps/town.json');

// Dùng TilemapLoader trong scene mới
const tilemap = new TilemapLoader(this);
tilemap.create(); // tự động đọc MapKey.World — override nếu cần
```
