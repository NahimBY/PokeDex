import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";

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
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [isNotMode, setIsNotMode] = useState(false);
  const [availableTypes, setAvailableTypes] = useState([]);

  // 1. LÓGICA DE CARGA EXTRAÍDA (useCallback para que no se recree)
  // <--- NUEVO: Función reutilizable para cargar datos
  const fetchPokemon = useCallback(async () => {
    try {
      setLoading(true);
      // Limpiamos error previo si estamos reintentando
      setError(null);

      const response = await fetch(
        "https://pokeapi.co/api/v2/pokemon?limit=999",
      );
      if (!response.ok) throw new Error("Error conectando con PokéApi");

      const data = await response.json();

      const detailsPromises = data.results.map(async (p) => {
        const res = await fetch(p.url);
        if (!res.ok) return null;
        return res.json();
      });

      const detailsRaw = await Promise.all(detailsPromises);
      const validDetails = detailsRaw.filter((d) => d !== null);

      const formattedPokemon = validDetails.map((p) => ({
        id: p.id,
        name: p.name,
        types: p.types.map((t) => t.type.name),
        image:
          p.sprites.other["official-artwork"].front_default ||
          p.sprites.front_default,
      }));

      const types = [...new Set(formattedPokemon.flatMap((p) => p.types))];

      setAvailableTypes(types);
      setPokemonList(formattedPokemon);

      // Si todo sale bien, aseguramos que el error se mantenga nulo
      setError(null);
    } catch (err) {
      setError("¡Ups! La API ha fallado. Reintentando conexión...");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. EFECTO INICIAL
  useEffect(() => {
    fetchPokemon();
  }, [fetchPokemon]);

  // 3. EFECTO DE RECONEXIÓN INTELIGENTE
  // <--- NUEVO: Detecta cuando vuelve internet o reintenta cada 5s si hay error
  useEffect(() => {
    let intervalId;

    // A. Si hay error, configurar un intervalo para reintentar cada 5 segundos
    if (error) {
      intervalId = setInterval(() => {
        console.log("Intentando reconectar con la API...");
        fetchPokemon();
      }, 5000);
    }

    // B. Detectar si el navegador recupera conexión a internet (Evento nativo)
    const handleOnline = () => {
      console.log("Conexión a internet detectada, recargando...");
      fetchPokemon();
    };

    window.addEventListener("online", handleOnline);

    // Limpieza al desmontar o cuando el error se resuelve
    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
    };
  }, [error, fetchPokemon]);

  // --- Lógica de Filtrado (Sin cambios) ---
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
        const excludeSearch = rawTerm ? !matchesSearch : true;
        const excludeType =
          selectedTypes.length > 0
            ? !poke.types.some((t) => selectedTypes.includes(t))
            : true;
        return excludeSearch && excludeType;
      } else {
        return matchesSearch && matchesType;
      }
    });
  }, [pokemonList, searchTerm, selectedTypes, isNotMode]);

  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  return (
    <div className="pokedex-container">
      <header className="header">
        <h1>
          Kanto Tech <span>PokéDex Analysis</span>
        </h1>
      </header>

      <div className="toolbar">
        <div className="input-group">
          <label>Búsqueda (Nombre/ID)</label>
          <input
            type="text"
            placeholder="Ej: Pikachu o 25"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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

      {/* ERROR BANNER: Ahora avisa que está reintentando */}
      {error && (
        <div className="error-banner">
          ⚠️ {error} <span className="retry-spinner">⏳</span>
        </div>
      )}

      {loading ? (
        <div className="loader">
          {/* Si ya hay un error previo y estamos cargando, es un reintento */}
          {error
            ? "Reintentando conexión con la base de datos..."
            : "Cargando 999 especímenes..."}
        </div>
      ) : (
        <>
          <div className="results-count">
            Encontrados: <strong>{filteredPokemon.length}</strong> criaturas
          </div>

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

