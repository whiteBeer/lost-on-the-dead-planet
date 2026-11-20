export const SHOP_ITEMS = [
    { id: "default", kind: "skin", name: "Выживший", price: 0, description: "Проверенная броня первого отряда.", image: "player_body_sprite.png" },
    { id: "ember", kind: "skin", name: "Алый рейдер", price: 15, description: "Красная броня и медный визор. Только внешний вид.", image: "skins/ember.png" },
    { id: "frost", kind: "skin", name: "Север", price: 35, description: "Белая арктическая броня ледяного разведчика.", image: "skins/frost.png" },
    { id: "viper", kind: "skin", name: "Радиолог", price: 65, description: "Защитный костюм и противогаз для мёртвой планеты.", image: "skins/viper.png" },
    { id: "spectre", kind: "skin", name: "Призрак", price: 100, description: "Графитовая броня с фиолетовым свечением.", image: "skins/spectre.png" }
] as const;

export function coinsForLevel(level:number) {
    return level <= 1 ? 0 : level <= 5 ? 1 : level <= 10 ? 2 : 3;
}
