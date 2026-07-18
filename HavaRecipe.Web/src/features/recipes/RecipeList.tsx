import { useEffect, useState } from 'react'
import { Alert, Container, Loader, Stack, Table, Text, Title } from '@mantine/core'
import { listRecipes } from '../../api/recipes'
import type { RecipeSummary } from '../../api/types'

export function RecipeList() {
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listRecipes()
      .then(setRecipes)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <Container>
      <Stack>
        <Title order={2}>Recipes</Title>

        {error && (
          <Alert color="red" title="Failed to load recipes">
            {error}
          </Alert>
        )}

        {!recipes && !error && <Loader />}

        {recipes && recipes.length === 0 && <Text c="dimmed">No recipes yet.</Text>}

        {recipes && recipes.length > 0 && (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Slug</Table.Th>
                <Table.Th>Created</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recipes.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.name}</Table.Td>
                  <Table.Td>{r.slug}</Table.Td>
                  <Table.Td>{new Date(r.createdAt).toLocaleString()}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Container>
  )
}
