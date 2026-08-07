using Microsoft.EntityFrameworkCore;
using Operion.Api.Models;

namespace Operion.Api.Data;

public sealed class OperionDbContext : DbContext
{
    public OperionDbContext(DbContextOptions<OperionDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<SessionRecord> Sessions => Set<SessionRecord>();
    public DbSet<SessionEventRecord> SessionEvents => Set<SessionEventRecord>();
    public DbSet<AiFeedbackRecord> AiFeedbacks => Set<AiFeedbackRecord>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<SessionEventRecord>().HasIndex(e => new { e.SessionId, e.EventId }).IsUnique();
        b.Entity<SessionEventRecord>().HasIndex(e => e.SessionId);
        b.Entity<AiFeedbackRecord>().HasIndex(e => e.SessionId);
    }
}
