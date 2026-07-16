namespace HavaRecipe.Api.Shared;

public static class Errors
{
    public static IResult ValidationFailure(string field, string message) =>
        TypedResults.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });
}
