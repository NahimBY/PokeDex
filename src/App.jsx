import React, { useState, useEffect, useMemo } from "react";
import "./App.css";

// Diccionario de colores por tipo de Pokémon
const TYPE_COLORS = {
  fire: "#FDDFDF",
  grass: "#DEFDE0",
  electric: "#FCF7DE",
  water: "#DEF3FD",
  ground: "#f4e7da",
  rock: "#d5d5d4",
  fairy: "#fceaff",
  poison: "#98d7a5",
  bug: "#f8d5a3",
  dragon: "#97b3e6",
  psychic: "#eaeda1",
  flying: "#F5F5F5",
  fighting: "#E6E0D4",
  normal: "#F5F5F5",
  ghost: "#705898",
  ice: "#98d8d8",
  steel: "#b7b7ce",
  dark: "#705746",
};

const Pokedex = () => {
  // --- Estados ---
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de Filtros (El "Super Buscador")
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]); // Selección Múltiple (+5 pts)
  const [isNotMode, setIsNotMode] = useState(false); // Operador NOT
  const [availableTypes, setAvailableTypes] = useState([]);

  // --- Carga de Datos (Requerimiento A) ---
  useEffect(() => {
    const fetchPokemon = async () => {
      try {
        setLoading(true);
        // 1. Obtener lista base (999 items)
        const response = await fetch(
          "https://pokeapi.co/api/v2/pokemon?limit=999",
        );
        if (!response.ok) throw new Error("Error conectando con PokéApi");

        const data = await response.json();

        // 2. Obtener detalles eficientemente (Promise.all)
        // Nota: Mapeamos los datos para extraer ID y hacer fetch de detalles necesarios
        const detailsPromises = data.results.map(async (p) => {
          const res = await fetch(p.url);
          if (!res.ok) return null;
          return res.json();
        });

        const detailsRaw = await Promise.all(detailsPromises);
        const validDetails = detailsRaw.filter((d) => d !== null);

        // 3. Formatear datos para nuestra UI
        const formattedPokemon = validDetails.map((p) => ({
          id: p.id,
          name: p.name,
          types: p.types.map((t) => t.type.name),
          image:
            p.sprites.other["official-artwork"].front_default ||
            p.sprites.front_default,
        }));

        // Extraer todos los tipos únicos para el selector
        const types = [...new Set(formattedPokemon.flatMap((p) => p.types))];

        setAvailableTypes(types);
        setPokemonList(formattedPokemon);
      } catch (err) {
        // Bonus: Manejo de Errores
        setError(
          "¡Ups! La API ha fallado. Por favor revisa tu conexión o intenta más tarde.",
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPokemon();
  }, []);

  // --- Lógica de Filtrado Avanzado (Requerimiento C) ---
  const filteredPokemon = useMemo(() => {
    return pokemonList.filter((poke) => {
      const rawTerm = searchTerm.toLowerCase().trim();
      const cleanTerm = rawTerm.replace("#", "");

      const idString = poke.id.toString();

      const matchName = poke.name.toLowerCase().includes(rawTerm);

      const isNumberSearch = !isNaN(cleanTerm) && cleanTerm !== "";
      const matchID =
        isNumberSearch &&
        (idString.includes(cleanTerm) || parseInt(cleanTerm) === poke.id);

      const matchesSearch = matchName || matchID;

      const matchesType =
        selectedTypes.length === 0 ||
        poke.types.some((t) => selectedTypes.includes(t));

      if (isNotMode) {
        // Si hay texto escrito, invertimos la coincidencia de búsqueda
        const excludeSearch = rawTerm ? !matchesSearch : true;

        // Si hay tipos seleccionados, invertimos la coincidencia de tipos
        const excludeType =
          selectedTypes.length > 0
            ? !poke.types.some((t) => selectedTypes.includes(t))
            : true;

        return excludeSearch && excludeType;
      } else {
        // Modo Normal (Inclusivo)
        return matchesSearch && matchesType;
      }
    });
  }, [pokemonList, searchTerm, selectedTypes, isNotMode]);

  // --- Handlers ---
  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  // --- Render ---
  return (
    <div className="pokedex-container">
      <header className="header">
        <h1>
          Kanto Tech <span>PokéDex Analysis</span>
        </h1>
      </header>

      {/* Barra de Herramientas (Super Buscador) */}
      <div className="toolbar">
        {/* Input Texto */}
        <div className="input-group">
          <label>Búsqueda (Nombre/ID)</label>
          <input
            type="text"
            placeholder="Ej: Pikachu o 25"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Selector de Tipos (Múltiple) */}
        <div className="input-group">
          <label>Filtro de Tipos (Selección múltiple)</label>
          <div className="type-selector">
            {availableTypes.map((type) => (
              <button
                key={type}
                className={`type-badge ${selectedTypes.includes(type) ? "active" : ""}`}
                style={{
                  backgroundColor: selectedTypes.includes(type)
                    ? TYPE_COLORS[type] || "#ccc"
                    : "#fff",
                  borderColor: TYPE_COLORS[type] || "#ccc",
                }}
                onClick={() => handleTypeToggle(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Switch NOT */}
        <div className="input-group switch-group">
          <label>Modo de Exclusión</label>
          <div
            className={`toggle-switch ${isNotMode ? "active" : ""}`}
            onClick={() => setIsNotMode(!isNotMode)}
          >
            <div className="switch-handle" />
          </div>
          <span className="switch-label">
            {isNotMode ? "EXCLUIR resultados (NOT)" : "INCLUIR resultados"}
          </span>
        </div>
      </div>

      {/* Manejo de Estados de UI */}
      {error && <div className="error-banner">⚠️ {error}</div>}

      {loading ? (
        <div className="loader">Cargando 999 especímenes...</div>
      ) : (
        <>
          <div className="results-count">
            Encontrados: <strong>{filteredPokemon.length}</strong> criaturas
          </div>

          {/* Grid de Resultados */}
          <div className="pokemon-grid">
            {filteredPokemon.map((poke) => (
              <div
                key={poke.id}
                className="pokemon-card"
                style={{
                  backgroundColor: TYPE_COLORS[poke.types[0]] || "#f5f5f5",
                }}
              >
                <span className="poke-id">
                  #{poke.id.toString().padStart(3, "0")}
                </span>
                <div className="img-container">
                  <img src={poke.image} alt={poke.name} loading="lazy" />
                </div>
                <h3 className="poke-name">{poke.name}</h3>
                <div className="poke-types">
                  {poke.types.map((t) => (
                    <span key={t} className="type-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {filteredPokemon.length === 0 && !error && (
              <div className="no-results">
                No se encontraron criaturas con estos filtros.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Pokedex;
