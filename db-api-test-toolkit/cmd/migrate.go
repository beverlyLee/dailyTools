package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"db-api-test-toolkit/pkg/migrate"

	"github.com/spf13/cobra"
)

var (
	migrateDbType     string
	migrateDbHost     string
	migrateDbPort     int
	migrateDbUser     string
	migrateDbPassword string
	migrateDbName     string
	migrateSSLMode    string
	migrateDryRun     bool
	migrateModelFile  string
)

var migrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "数据库迁移助手",
	Long: `自动检测模型定义与数据库 schema 的差异，生成迁移脚本。

支持的数据库类型: sqlite, postgres, mysql`,
	Run: func(cmd *cobra.Command, args []string) {
		runMigrate()
	},
}

func init() {
	rootCmd.AddCommand(migrateCmd)

	migrateCmd.Flags().StringVarP(&migrateDbType, "db-type", "t", "sqlite", "数据库类型 (sqlite, postgres, mysql)")
	migrateCmd.Flags().StringVarP(&migrateDbHost, "host", "H", "localhost", "数据库主机地址")
	migrateCmd.Flags().IntVarP(&migrateDbPort, "port", "p", 5432, "数据库端口")
	migrateCmd.Flags().StringVarP(&migrateDbUser, "user", "u", "", "数据库用户名")
	migrateCmd.Flags().StringVarP(&migrateDbPassword, "password", "P", "", "数据库密码")
	migrateCmd.Flags().StringVarP(&migrateDbName, "db-name", "d", "database.db", "数据库名称或SQLite文件路径")
	migrateCmd.Flags().StringVar(&migrateSSLMode, "ssl-mode", "disable", "PostgreSQL SSL模式 (disable, require, verify-ca, verify-full)")
	migrateCmd.Flags().BoolVar(&migrateDryRun, "dry-run", false, "仅打印将要执行的SQL，不实际执行")
	migrateCmd.Flags().StringVarP(&migrateModelFile, "model", "m", "", "模型定义JSON文件路径")
}

func runMigrate() {
	var dbType migrate.DatabaseType
	switch migrateDbType {
	case "sqlite":
		dbType = migrate.SQLite
	case "postgres":
		dbType = migrate.PostgreSQL
	case "mysql":
		dbType = migrate.MySQL
	default:
		fmt.Printf("错误: 不支持的数据库类型: %s\n", migrateDbType)
		os.Exit(1)
	}

	config := &migrate.DatabaseConfig{
		Type:     dbType,
		Host:     migrateDbHost,
		Port:     migrateDbPort,
		User:     migrateDbUser,
		Password: migrateDbPassword,
		DBName:   migrateDbName,
		SSLMode:  migrateSSLMode,
	}

	db, err := migrate.NewDatabase(config)
	if err != nil {
		fmt.Printf("错误: 无法连接到数据库: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	manager := migrate.NewMigrationManager(db, dbType)

	var targetSchema *migrate.ModelDefinition

	if migrateModelFile != "" {
		targetSchema, err = loadModelFromFile(migrateModelFile)
		if err != nil {
			fmt.Printf("错误: 无法加载模型定义: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("已加载目标模型定义")
	} else {
		currentSchema, err := manager.DetectSchema()
		if err != nil {
			fmt.Printf("错误: 无法检测当前schema: %v\n", err)
			os.Exit(1)
		}

		fmt.Println("当前数据库 Schema:")
		for _, table := range currentSchema.Tables {
			fmt.Printf("  表: %s\n", table.Name)
			for _, col := range table.Columns {
				nullable := "NOT NULL"
				if col.Nullable {
					nullable = "NULL"
				}
				fmt.Printf("    列: %s (%s) %s\n", col.Name, col.Type, nullable)
			}
			for _, idx := range table.Indexes {
				unique := ""
				if idx.Unique {
					unique = "UNIQUE "
				}
				fmt.Printf("    索引: %s%s (%v)\n", unique, idx.Name, idx.Columns)
			}
		}
		return
	}

	script, diffs, err := manager.GenerateMigrationScript(targetSchema)
	if err != nil {
		fmt.Printf("错误: 无法生成迁移脚本: %v\n", err)
		os.Exit(1)
	}

	if len(diffs) == 0 {
		fmt.Println("没有检测到 schema 差异，无需迁移")
		return
	}

	fmt.Println("检测到以下 schema 差异:")
	for i, diff := range diffs {
		fmt.Printf("  %d. %s\n", i+1, diff.Description)
	}

	fmt.Println("\n生成的迁移脚本:")
	fmt.Println("=================== Upgrade ===================")
	fmt.Println(script.Upgrade)
	fmt.Println("=================== Downgrade ===================")
	fmt.Println(script.Downgrade)

	err = manager.ApplyMigration(script, migrateDryRun)
	if err != nil {
		fmt.Printf("错误: 应用迁移失败: %v\n", err)
		os.Exit(1)
	}
}

func loadModelFromFile(filePath string) (*migrate.ModelDefinition, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var model migrate.ModelDefinition
	if err := json.Unmarshal(data, &model); err != nil {
		return nil, err
	}

	return &model, nil
}
