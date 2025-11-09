import { drawUniqueFilms } from "../../../../modules/trivia/utils/drawUniqueFilms";
import type { CustomFilm } from "../../../../data/customFilms";

describe("drawUniqueFilms", () => {
  const createFilm = (
    name: string,
    addedBy: string,
    id?: string
  ): CustomFilm => ({
    id: id || `film-${name}-${Date.now()}`,
    name,
    addedAt: new Date().toISOString(),
    addedBy
  });

  // Helper function for potential future use
  /*
  const _createParticipants = (names: string[], teamName: string) => {
    const map = new Map<string, { name: string; teamName: string }>()
    names.forEach((name, index) => {
      map.set(`participant-${index}`, { name, teamName })
    })
    return map
  }
  */

  describe("Cenário 1: 15 jogadores, cada um indica 1 filme", () => {
    const teamANames = ["João A", "Maria A", "Pedro A", "Ana A", "Carlos A"];
    const teamBNames = ["João B", "Maria B", "Pedro B", "Ana B", "Carlos B"];
    const teamCNames = ["João C", "Maria C", "Pedro C", "Ana C", "Carlos C"];

    const allParticipants = [
      ...teamANames.map((name, i) => ({
        name,
        id: `participant-a-${i}`,
        teamName: "Time A"
      })),
      ...teamBNames.map((name, i) => ({
        name,
        id: `participant-b-${i}`,
        teamName: "Time B"
      })),
      ...teamCNames.map((name, i) => ({
        name,
        id: `participant-c-${i}`,
        teamName: "Time C"
      }))
    ];

    const participantsMap = new Map<
      string,
      { name: string; teamName: string }
    >();
    allParticipants.forEach((p) => {
      participantsMap.set(p.id, { name: p.name, teamName: p.teamName });
    });

    const films: CustomFilm[] = allParticipants.map((p, i) =>
      createFilm(`Filme ${i + 1}`, p.name, `film-${i}`)
    );

    it("deve sortear 4 filmes únicos sem repetição", () => {
      const results = drawUniqueFilms(films, participantsMap, 4, false);

      expect(results.length).toBe(4);

      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(4);
    });

    it("deve sortear 5 filmes únicos sem repetição", () => {
      const results = drawUniqueFilms(films, participantsMap, 5, false);

      expect(results.length).toBe(5);

      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(5);
    });

    it("deve sortear 6 filmes únicos sem repetição", () => {
      const results = drawUniqueFilms(films, participantsMap, 6, false);

      expect(results.length).toBe(6);

      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(6);
    });

    it("nunca deve repetir títulos mesmo em múltiplas execuções", () => {
      for (let i = 0; i < 10; i++) {
        const results = drawUniqueFilms(films, participantsMap, 5, false);
        const titles = results.map((r) => r.film.name.toLowerCase().trim());
        const uniqueTitles = new Set(titles);
        expect(uniqueTitles.size).toBe(titles.length);
      }
    });
  });

  describe("Cenário 2: 15 jogadores, cada um indica 3 filmes", () => {
    const teamANames = ["João A", "Maria A", "Pedro A", "Ana A", "Carlos A"];
    const teamBNames = ["João B", "Maria B", "Pedro B", "Ana B", "Carlos B"];
    const teamCNames = ["João C", "Maria C", "Pedro C", "Ana C", "Carlos C"];

    const allParticipants = [
      ...teamANames.map((name, i) => ({
        name,
        id: `participant-a-${i}`,
        teamName: "Time A"
      })),
      ...teamBNames.map((name, i) => ({
        name,
        id: `participant-b-${i}`,
        teamName: "Time B"
      })),
      ...teamCNames.map((name, i) => ({
        name,
        id: `participant-c-${i}`,
        teamName: "Time C"
      }))
    ];

    const participantsMap = new Map<
      string,
      { name: string; teamName: string }
    >();
    allParticipants.forEach((p) => {
      participantsMap.set(p.id, { name: p.name, teamName: p.teamName });
    });

    const films: CustomFilm[] = [];
    allParticipants.forEach((p, personIndex) => {
      films.push(
        createFilm(`Filme ${personIndex}-1`, p.name, `film-${personIndex}-1`),
        createFilm(`Filme ${personIndex}-2`, p.name, `film-${personIndex}-2`),
        createFilm(`Filme ${personIndex}-3`, p.name, `film-${personIndex}-3`)
      );
    });

    it("deve sortear 4 filmes únicos, descartando outros filmes de pessoas que já tiveram 1", () => {
      const results = drawUniqueFilms(films, participantsMap, 4, false);

      expect(results.length).toBe(4);

      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(4);

      const personNames = results.map((r) =>
        r.participantName.toLowerCase().trim()
      );
      const uniquePersons = new Set(personNames);
      expect(uniquePersons.size).toBe(4);
    });

    it("deve sortear 5 filmes únicos, descartando outros filmes de pessoas que já tiveram 1", () => {
      const results = drawUniqueFilms(films, participantsMap, 5, false);

      expect(results.length).toBe(5);

      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(5);

      const personNames = results.map((r) =>
        r.participantName.toLowerCase().trim()
      );
      const uniquePersons = new Set(personNames);
      expect(uniquePersons.size).toBe(5);
    });

    it("deve sortear 6 filmes únicos, descartando outros filmes de pessoas que já tiveram 1", () => {
      const results = drawUniqueFilms(films, participantsMap, 6, false);

      expect(results.length).toBe(6);

      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(6);

      const personNames = results.map((r) =>
        r.participantName.toLowerCase().trim()
      );
      const uniquePersons = new Set(personNames);
      expect(uniquePersons.size).toBe(6);
    });

    it("com allowMultiplePerPerson=true, deve permitir múltiplos filmes da mesma pessoa", () => {
      const results = drawUniqueFilms(films, participantsMap, 6, true);

      expect(results.length).toBe(6);

      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(6);

      const personNames = results.map((r) =>
        r.participantName.toLowerCase().trim()
      );
      const personCounts = new Map<string, number>();
      personNames.forEach((name) => {
        personCounts.set(name, (personCounts.get(name) || 0) + 1);
      });

      const hasMultiple = Array.from(personCounts.values()).some(
        (count) => count > 1
      );

      if (!hasMultiple) {
        const results2 = drawUniqueFilms(films, participantsMap, 10, true);
        const personNames2 = results2.map((r) =>
          r.participantName.toLowerCase().trim()
        );
        const personCounts2 = new Map<string, number>();
        personNames2.forEach((name) => {
          personCounts2.set(name, (personCounts2.get(name) || 0) + 1);
        });
        const hasMultiple2 = Array.from(personCounts2.values()).some(
          (count) => count > 1
        );
        expect(hasMultiple2).toBe(true);
      } else {
        expect(hasMultiple).toBe(true);
      }
    });

    it("com allowMultiplePerPerson=true e maxFilms alto, deve garantir múltiplos filmes por pessoa", () => {
      const results = drawUniqueFilms(films, participantsMap, 20, true);

      expect(results.length).toBe(20);

      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(20);

      const personNames = results.map((r) =>
        r.participantName.toLowerCase().trim()
      );
      const personCounts = new Map<string, number>();
      personNames.forEach((name) => {
        personCounts.set(name, (personCounts.get(name) || 0) + 1);
      });

      const hasMultiple = Array.from(personCounts.values()).some(
        (count) => count > 1
      );
      expect(hasMultiple).toBe(true);
    });
  });

  describe("Cenário 3: Filmes com títulos duplicados", () => {
    const participantsMap = new Map([
      ["participant-1", { name: "João", teamName: "Time A" }],
      ["participant-2", { name: "Maria", teamName: "Time B" }]
    ]);

    const films: CustomFilm[] = [
      createFilm("Matrix", "João", "film-1"),
      createFilm("Matrix", "Maria", "film-2"),
      createFilm("Titanic", "João", "film-3"),
      createFilm("Avatar", "Maria", "film-4"),
      createFilm("Inception", "João", "film-5")
    ];

    it('deve sortear no máximo 1 "Matrix" mesmo sendo indicado por duas pessoas', () => {
      for (let i = 0; i < 10; i++) {
        const results = drawUniqueFilms(films, participantsMap, 5, false);

        const matrixCount = results.filter(
          (r) => r.film.name.toLowerCase().trim() === "matrix"
        ).length;

        expect(matrixCount).toBeLessThanOrEqual(1);
      }

      const results = drawUniqueFilms(films, participantsMap, 5, false);
      const allTitles = results.map((r) => r.film.name.toLowerCase().trim());
      const matrixCount = allTitles.filter((t) => t === "matrix").length;
      expect(matrixCount).toBeLessThanOrEqual(1);
    });

    it("nunca deve ter títulos duplicados no resultado", () => {
      for (let i = 0; i < 10; i++) {
        const results = drawUniqueFilms(films, participantsMap, 5, false);
        const titles = results.map((r) => r.film.name.toLowerCase().trim());
        const uniqueTitles = new Set(titles);
        expect(uniqueTitles.size).toBe(titles.length);
      }
    });
  });

  describe("Cenário 4: Limite de filmes menor que participantes", () => {
    const participantsMap = new Map([
      ["p1", { name: "Pessoa 1", teamName: "Time A" }],
      ["p2", { name: "Pessoa 2", teamName: "Time A" }],
      ["p3", { name: "Pessoa 3", teamName: "Time A" }],
      ["p4", { name: "Pessoa 4", teamName: "Time A" }],
      ["p5", { name: "Pessoa 5", teamName: "Time A" }],
      ["p6", { name: "Pessoa 6", teamName: "Time A" }],
      ["p7", { name: "Pessoa 7", teamName: "Time A" }],
      ["p8", { name: "Pessoa 8", teamName: "Time A" }],
      ["p9", { name: "Pessoa 9", teamName: "Time A" }],
      ["p10", { name: "Pessoa 10", teamName: "Time A" }],
      ["p11", { name: "Pessoa 11", teamName: "Time A" }],
      ["p12", { name: "Pessoa 12", teamName: "Time A" }],
      ["p13", { name: "Pessoa 13", teamName: "Time A" }],
      ["p14", { name: "Pessoa 14", teamName: "Time A" }],
      ["p15", { name: "Pessoa 15", teamName: "Time A" }]
    ]);

    const films: CustomFilm[] = Array.from({ length: 15 }, (_, i) =>
      createFilm(`Filme ${i + 1}`, `Pessoa ${i + 1}`, `film-${i}`)
    );

    it("deve sortear apenas 4 filmes únicos mesmo tendo 15 participantes", () => {
      const results = drawUniqueFilms(films, participantsMap, 4, false);

      expect(results.length).toBe(4);

      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(4);
    });

    it("alguns participantes não receberão filme quando limite é menor", () => {
      const results = drawUniqueFilms(films, participantsMap, 4, false);

      expect(results.length).toBe(4);
      expect(results.length).toBeLessThan(participantsMap.size);
    });
  });

  describe("Casos extremos", () => {
    it("deve retornar array vazio se não há filmes", () => {
      const participantsMap = new Map();
      const results = drawUniqueFilms([], participantsMap, 5, false);
      expect(results).toEqual([]);
    });

    it("deve retornar array vazio se maxFilms é 0", () => {
      const participantsMap = new Map([
        ["p1", { name: "João", teamName: "Time A" }]
      ]);
      const films = [createFilm("Filme 1", "João")];
      const results = drawUniqueFilms(films, participantsMap, 0, false);
      expect(results).toEqual([]);
    });

    it("deve retornar todos os filmes únicos se maxFilms é maior que filmes disponíveis", () => {
      const participantsMap = new Map([
        ["p1", { name: "João", teamName: "Time A" }]
      ]);
      const films = [
        createFilm("Filme 1", "João"),
        createFilm("Filme 2", "João"),
        createFilm("Filme 3", "João")
      ];
      const results = drawUniqueFilms(films, participantsMap, 10, false);

      expect(results.length).toBeLessThanOrEqual(3);
      const titles = results.map((r) => r.film.name.toLowerCase().trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(results.length);
    });
  });
});
