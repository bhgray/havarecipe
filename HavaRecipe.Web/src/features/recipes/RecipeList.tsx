import { useState } from 'react'
import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  Popover,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteRecipe, listRecipes } from '../../api/recipes'

export function RecipeList() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Which row's delete confirmation is open (deleting is destructive and there's no undo).
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null)

  const {
    data: recipes,
    error,
    isPending,
  } = useQuery({
    queryKey: ['recipes'],
    queryFn: listRecipes,
  })

  const remove = useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
    onSettled: () => setConfirmSlug(null),
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

        {remove.isError && (
          <Alert color="red" title="Delete failed">
            {remove.error.message}
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
                <Table.Th w={100} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recipes.map((r) => (
                <Table.Tr
                  key={r.id}
                  style={{ cursor: 'pointer' }}
                  onDoubleClick={() => navigate(`/recipes/${encodeURIComponent(r.slug)}`)}
                >
                  <Table.Td>
                    {/* Also a link: double-click alone is undiscoverable and unreachable by
                        keyboard, so the name stays a normal, focusable way in. */}
                    <Anchor component={Link} to={`/recipes/${encodeURIComponent(r.slug)}`}>
                      {r.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>{r.slug}</Table.Td>
                  <Table.Td>{new Date(r.createdAt).toLocaleString()}</Table.Td>
                  {/* Don't let interacting with delete navigate to the recipe. */}
                  <Table.Td onDoubleClick={(e) => e.stopPropagation()}>
                    <Popover
                      opened={confirmSlug === r.slug}
                      onChange={(opened) => setConfirmSlug(opened ? r.slug : null)}
                      position="left"
                      withArrow
                      shadow="md"
                      width={260}
                    >
                      <Popover.Target>
                        <Button
                          variant="subtle"
                          color="red"
                          size="compact-sm"
                          onClick={() => setConfirmSlug(confirmSlug === r.slug ? null : r.slug)}
                        >
                          Delete
                        </Button>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Stack gap="xs">
                          <Text size="sm">
                            Delete <b>{r.name}</b>? This can&apos;t be undone.
                          </Text>
                          <Group justify="flex-end" gap="xs">
                            <Button
                              variant="default"
                              size="compact-sm"
                              onClick={() => setConfirmSlug(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              color="red"
                              size="compact-sm"
                              loading={remove.isPending && remove.variables === r.slug}
                              onClick={() => remove.mutate(r.slug)}
                            >
                              Delete
                            </Button>
                          </Group>
                        </Stack>
                      </Popover.Dropdown>
                    </Popover>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Container>
  )
}
