-- Corrigir contagem de cotas vendidas para todos os concursos
UPDATE concursos 
SET cotas_vendidas = COALESCE((
    SELECT SUM(quantidade_cotas) 
    FROM participacoes 
    WHERE concurso_id = concursos.id
), 0);