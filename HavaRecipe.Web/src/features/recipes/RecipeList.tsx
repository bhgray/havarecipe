import { Alert, Container, Loader, Stack, Table, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { listRecipes } from '../../api/recipes'

export function RecipeList() {
  const {
    data: recipes,
    error,
    isPending,
  } = useQuery({
    queryKey: ['recipes'],
    queryFn: listRecipes,
  })

  return (
    <Container>
      <Stack>
        <Title order={2}>Recipes</Title>

        {error && (
          <Alert color="red" title="Failed to load recipes">
            {error.message}
          </Alert>
        )}

        {isPending && <Loader />}

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
