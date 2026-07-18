import { useEffect, useState } from 'react'
import { Alert, Anchor, Button, Card, Group, Stack, Text, TextInput } from '@mantine/core'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRecipe } from '../../api/recipes'
import { ApiError } from '../../api/client'
import type { ImportRecipeResponse } from '../../api/types'

export function SaveRecipe({ imported }: { imported: ImportRecipeResponse }) {
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState(imported.suggestedSlug)
  const [name, setName] = useState(imported.suggestedName)

  // A different recipe was imported — reset the fields to its suggestions.
  useEffect(() => {
    setSlug(imported.suggestedSlug)
    setName(imported.suggestedName)
  }, [imported])

  const save = useMutation({
    mutationFn: () =>
      createRecipe({ slug: slug.trim(), name: name.trim(), recipeJsonLd: imported.recipeJsonLd }),
    onSuccess: () => {
      // The recipes list is cached; drop it so the newly saved recipe appears.
      void queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })

  const isSlugConflict = save.error instanceof ApiError && save.error.status === 409

  // Clear stale success/error feedback once the user starts editing again.
  function edited(setter: (value: string) => void) {
    return (value: string) => {
      if (save.isSuccess || save.isError) save.reset()
      setter(value)
    }
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Text fw={500}>Save to your recipes</Text>

        <Group align="flex-start" grow>
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => edited(setName)(e.currentTarget.value)}
          />
          <TextInput
            label="Slug"
            description="Used in the recipe's URL; must be unique."
            value={slug}
            error={isSlugConflict ? 'Already taken' : undefined}
            onChange={(e) => edited(setSlug)(e.currentTarget.value)}
          />
        </Group>

        <Group>
          <Button
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={!slug.trim() || !name.trim()}
          >
            Save recipe
          </Button>
        </Group>

        {save.isError && (
          <Alert color={isSlugConflict ? 'yellow' : 'red'} title={isSlugConflict ? 'Slug already in use' : 'Save failed'}>
            {save.error.message}
          </Alert>
        )}

        {save.isSuccess && (
          <Alert color="green" title="Saved">
            <Anchor component={Link} to="/recipes">
              View it in your recipes
            </Anchor>
          </Alert>
        )}
      </Stack>
    </Card>
  )
}
